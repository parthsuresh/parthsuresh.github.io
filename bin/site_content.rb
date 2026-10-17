# frozen_string_literal: true

require "bibtex"
require "yaml"
require "date"

module SiteContent
  EM_DASH = "—"
  EN_DASH = "–"
  DEMO_EXCLUDES = %w[_posts/ _projects/ _books/ _teachings/].freeze
  ALLOWED_OVERRIDES = {
    "_layouts" => ["about.liquid"].freeze,
    "_sass" => ["_themes.scss"].freeze
  }.freeze
  FORBIDDEN_PATHS = %w[_includes _scripts assets/tailwind assets/webfonts tailwind.config.js].freeze

  module_function

  def check_repo(root)
    root = File.expand_path(root)
    bib_path = File.join(root, "_bibliography/papers.bib")
    about_path = File.join(root, "_pages/about.md")
    errors = []
    errors.concat(config_errors(File.join(root, "_config.yml")))
    errors.concat(bibliography_errors(bib_path, root))
    errors.concat(citation_errors(File.join(root, "_data/citations.yml"), bib_path))
    errors.concat(news_errors(File.join(root, "_news"), bib_path))
    errors.concat(about_errors(about_path))
    errors.concat(experience_errors(File.join(root, "_data/experience.yml"), about_path))
    errors.concat(override_errors(root))
    errors
  end

  def override_errors(root)
    errors = []
    FORBIDDEN_PATHS.each do |rel|
      next unless File.exist?(File.join(root, rel))

      errors << "#{rel} exists. Do not add that path in this repo. The only committed theme overrides are _layouts/about.liquid and _sass/_themes.scss."
    end
    ALLOWED_OVERRIDES.each do |dir, allowed|
      path = File.join(root, dir)
      next unless Dir.exist?(path)

      found = Dir.children(path).reject { |name| name.start_with?(".") }.sort
      next if found == allowed.sort

      errors << "#{dir} may contain only #{allowed.join(", ")}. Found #{found.join(", ")}. Do not add another theme override."
    end
    errors
  end

  def config_errors(path)
    config = YAML.load_file(path)
    errors = []
    baseurl = config["baseurl"]
    unless baseurl.nil? || baseurl == ""
      errors << "#{path} baseurl is #{baseurl.inspect}. Leave baseurl empty. https://parthsuresh.com/ is the site root."
    end
    exclude = Array(config["exclude"]).map(&:to_s)
    DEMO_EXCLUDES.each do |item|
      next if exclude.include?(item)

      errors << "#{path} exclude must include #{item}. That path is al-folio demo content and must not be published."
    end
    if exclude.include?("_news") || exclude.include?("_news/")
      errors << "#{path} exclude must not include _news/. /news/ is a published page."
    end
    errors
  end

  def bibliography_errors(path, asset_root = nil)
    bib = BibTeX.open(path)
    errors = []
    seen = {}
    bib.each do |entry|
      next unless entry.is_a?(BibTeX::Entry)

      key = entry.key.to_s
      if seen[key]
        errors << "#{path} #{key}: cite key is duplicated. Keep one entry."
      end
      seen[key] = true

      year = entry.year.to_s
      unless year.match?(/\A(19|20)\d{2}\z/)
        errors << "#{path} #{key}: set year to a four-digit year. Got #{year.inspect}."
      end

      venue_raw = [entry[:booktitle], entry[:journal]].compact.map(&:to_s).join(" ")
      if venue_raw.strip.empty?
        errors << "#{path} #{key}: add booktitle or journal."
      end
      venue_plain = venue_raw.gsub(/[{}]/, "")
      if year.match?(/\A\d{4}\z/) && venue_plain.match?(/\b#{Regexp.escape(year)}\b/)
        errors << "#{path} #{key}: booktitle or journal contains #{year}, and year is #{year}. The publications template appends year, so remove #{year} from the venue."
      end

      author = entry.author.to_s
      unless author.match?(/Suresh,\s*Parth/)
        errors << "#{path} #{key}: author must include Suresh, Parth."
      end
      if author.include?("Einstein") || entry.title.to_s.include?("Einstein")
        errors << "#{path} #{key}: this is template content. Remove the Einstein entry."
      end
      if entry[:google_scholar_id].to_s.strip.empty?
        errors << "#{path} #{key}: add google_scholar_id. Use the cluster id after the colon in _data/citations.yml."
      end
      if entry[:pdf].to_s.strip.empty?
        errors << "#{path} #{key}: add a pdf URL."
      end

      preview = entry[:preview].to_s.strip
      next if preview.empty? || asset_root.nil?

      image = File.join(asset_root, "assets/img/publication_preview", File.basename(preview))
      next if File.file?(image)

      errors << "#{path} #{key}: preview file assets/img/publication_preview/#{File.basename(preview)} does not exist. Add the image or delete the preview field."
    end
    errors
  rescue StandardError => e
    ["#{path}: could not parse BibTeX (#{e.message})."]
  end

  def citation_errors(citations_path, bib_path)
    return [] unless File.file?(citations_path)

    bib = BibTeX.open(bib_path)
    known = []
    bib.each do |entry|
      next unless entry.is_a?(BibTeX::Entry)

      id = entry[:google_scholar_id].to_s.strip
      known << id unless id.empty?
    end
    data = YAML.load_file(citations_path)
    papers = data.is_a?(Hash) ? data["papers"] : nil
    unless papers.is_a?(Hash)
      return ["#{citations_path} must contain a papers map. See _data/citations.yml."]
    end

    papers.filter_map do |key, _row|
      id = key.to_s.split(":").last
      next if known.include?(id)

      "#{citations_path} key #{key} is not a google_scholar_id in _bibliography/papers.bib. Delete the leftover citation or add the paper."
    end
  rescue StandardError => e
    ["#{citations_path}: could not parse citations (#{e.message})."]
  end

  def news_errors(dir, bib_path)
    return ["#{dir} is missing. News items live in _news/."] unless Dir.exist?(dir)

    bib_text = File.file?(bib_path) ? File.read(bib_path) : ""
    errors = []
    files = Dir[File.join(dir, "*.md")].sort
    errors << "#{dir} has no news items." if files.empty?
    files.each do |path|
      errors.concat(news_file_errors(path, bib_text))
    end
    errors
  end

  def news_file_errors(path, bib_text)
    raw = File.read(path)
    match = raw.match(/\A---\n(.*?)\n---\n/m)
    unless match
      return ["#{path} needs YAML front matter between --- lines."]
    end

    meta = YAML.safe_load(match[1], permitted_classes: [Time, Date]) || {}
    body = raw.sub(/\A---\n.*?\n---\n/m, "")
    prose = body.gsub(/<style\b.*?<\/style>/m, "")
    errors = []
    if prose.include?(EM_DASH) || prose.include?(EN_DASH)
      errors << "#{path} contains an em dash or en dash. Use a hyphen."
    end
    unless meta.is_a?(Hash) && meta["inline"] == true
      errors << "#{path} must set inline: true. Otherwise the news table shows a title link instead of the sentence."
    end
    date = meta.is_a?(Hash) ? meta["date"] : nil
    unless date.is_a?(Time) || date.is_a?(Date)
      errors << "#{path} date must be a timestamp. Got #{date.inspect}."
    end
    prose.scan(%r{arxiv\.org/abs/(\d{4}\.\d{4,5})}) do |id|
      next if bib_text.include?(id[0])

      errors << "#{path} links arXiv #{id[0]}, which is not in _bibliography/papers.bib. Add the paper or change the link."
    end
    errors
  rescue StandardError => e
    ["#{path}: could not parse news (#{e.message})."]
  end

  def about_errors(path)
    meta = front_matter(File.read(path))
    return [] if meta["title"] == "about"

    ["#{path} title is #{meta["title"].inspect}. Set title: about. al-folio prints that title as the homepage navbar label."]
  end

  def experience_errors(exp_path, about_path)
    unless File.file?(exp_path)
      return ["#{exp_path} is missing. Put role facts in _data/experience.yml and keep the same words in _pages/about.md."]
    end

    data = YAML.load_file(exp_path)
    roles = data.is_a?(Hash) ? data["roles"] : nil
    unless roles.is_a?(Array) && !roles.empty?
      return ["#{exp_path} needs a roles list."]
    end

    prose = about_prose(File.read(about_path))
    errors = []
    current = roles.count { |role| role.is_a?(Hash) && role["current"] == true }
    unless current == 1
      errors << "#{exp_path} needs exactly one role with current: true."
    end
    roles.each_with_index do |role, index|
      unless role.is_a?(Hash)
        errors << "#{exp_path} roles[#{index}] must be a mapping with title, organization, or prose."
        next
      end
      %w[title organization prose].each do |field|
        value = role[field].to_s
        next if value.strip.empty?
        next if prose.include?(value)

        errors << "#{exp_path} roles[#{index}] #{field} #{value.inspect} does not appear in the about-page prose. Update _pages/about.md and _data/experience.yml together."
      end
    end
    errors
  end

  def about_prose(raw)
    body = raw.sub(/\A---\n.*?\n---\n/m, "")
    body.gsub(/<style\b.*?<\/style>/m, "")
  end

  def front_matter(raw)
    match = raw.match(/\A---\n(.*?)\n---\n/m)
    return {} unless match

    YAML.safe_load(match[1], permitted_classes: [Time, Date]) || {}
  end
end
