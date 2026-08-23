# frozen_string_literal: true

# Builds formatting-stripped markdown siblings for published HTML pages so
# Accept: text/markdown negotiation has an origin file to serve.
class MarkdownSiblingsGenerator < Jekyll::Generator
  safe true
  priority :low

  def generate(site)
    write_page(site, "publications.md", publications_markdown(site))
    write_page(site, "news.md", news_markdown(site))
    write_page(site, "404.md", not_found_markdown(site))
  end

  private

  def write_page(site, permalink, body)
    # Use an .html source name so Kramdown does not turn the markdown into HTML
    # while still publishing the file at the .md permalink.
    name = permalink.sub(/\.md\z/, "-markdown.html")
    page = Jekyll::PageWithoutAFile.new(site, site.source, "", name)
    page.content = body
    page.data["layout"] = nil
    page.data["permalink"] = "/#{permalink}"
    page.data["sitemap"] = false
    site.pages << page
  end

  def publications_markdown(site)
    entries = load_bib_entries(site)
    lines = ["# Publications", "", "Publications in reverse chronological order.", ""]
    entries.group_by { |entry| entry[:year] }.sort.reverse.each do |year, year_entries|
      lines << "## #{year}"
      lines << ""
      year_entries.each do |entry|
        citation = "**#{entry[:title]}**. #{entry[:authors]}."
        citation += " *#{entry[:venue]}*." if entry[:venue]
        citation += " [PDF](#{entry[:pdf]})." if entry[:pdf]
        lines << "- #{citation}"
      end
      lines << ""
    end
    lines.join("\n")
  end

  def news_markdown(site)
    docs = Array(site.collections["news"]&.docs).sort_by { |doc| doc.date }.reverse
    lines = ["# News", ""]
    docs.each do |doc|
      date = doc.date.strftime("%Y-%m-%d")
      body = strip_front_matter(File.read(doc.path)).strip.gsub(/\n+/, " ")
      lines << "- #{date}: #{body}"
    end
    lines << ""
    lines.join("\n")
  end

  def not_found_markdown(site)
    home = "#{site.config['url']}#{site.config['baseurl']}"
    <<~MD
      # Page not found

      Nothing exists at this path.

      - [Home](#{home}/)
      - [Publications](#{home}/publications/)
      - [llms.txt](#{home}/llms.txt)
      - [Sitemap](#{home}/sitemap.xml)
    MD
  end

  def load_bib_entries(site)
    bib_path = File.join(site.source, "_bibliography", "papers.bib")
    return [] unless File.exist?(bib_path)

    File.read(bib_path).split(/^@/).drop(1).filter_map do |block|
      fields = parse_bib_fields(block)
      title = fields["title"]
      next unless title

      {
        title: title,
        authors: fields["author"].to_s.gsub(" and ", ", "),
        year: fields["year"].to_s,
        venue: fields["journal"] || fields["booktitle"],
        pdf: fields["pdf"],
      }
    end
  end

  def parse_bib_fields(block)
    fields = {}
    idx = 0
    while (match = block.match(/(\w+)\s*=\s*\{/, idx))
      key = match[1]
      start = match.end(0)
      depth = 1
      cursor = start
      while cursor < block.length && depth.positive?
        depth += 1 if block[cursor] == "{"
        depth -= 1 if block[cursor] == "}"
        cursor += 1
      end
      fields[key] = unwrap_tex(block[start...(cursor - 1)])
      idx = cursor
    end
    fields
  end

  def unwrap_tex(value)
    value.gsub(/\{([^{}]+)\}/, '\1').gsub(/\s+/, " ").strip
  end

  def strip_front_matter(text)
    text.sub(/\A---\n.*?\n---\n/m, "")
  end
end
