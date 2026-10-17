# frozen_string_literal: true

require "find"

# Resolves href and src values in a built site against files on disk.
module LocalLinks
  module_function

  def check(site)
    site = File.expand_path(site)
    unless Dir.exist?(site)
      return ["#{site} does not exist. Run JEKYLL_ENV=production bundle exec jekyll build first."]
    end

    errors = []
    Find.find(site) do |path|
      next unless path.end_with?(".html")

      File.read(path).scan(/(?:href|src|srcset)\s*=\s*"([^"]*)"/i) do |match|
        each_url(match[0]) do |url|
          next if skip?(url)

          local_path = url.split("#", 2).first.split("?", 2).first
          next unless looks_like_path?(local_path)

          target = resolve(site, path, url)
          next if target && inside?(site, target) && exists?(target)

          errors << "#{path.delete_prefix(site + "/")} links to #{url}, which is not a file under #{site}. Add the file or fix the link."
        end
      end
    end
    errors.uniq
  end

  def each_url(value)
    if value.match?(/\s+\d/)
      value.split(",").each do |part|
        url = part.strip.split(/\s+/).first
        yield url if url
      end
    else
      yield value
    end
  end

  def looks_like_path?(path)
    !path.nil? && !path.empty? && path.match?(%r{\A/?[A-Za-z0-9._~@%+-]+(?:/[A-Za-z0-9._~@%+-]*)*/?\z})
  end

  def skip?(url)
    url.nil? || url.empty? || url.start_with?("#") || url.match?(/\A[a-z][a-z0-9+.-]*:/i) || url.start_with?("//")
  end

  def resolve(site, html_path, url)
    path = url.split("#", 2).first.split("?", 2).first
    return nil if path.nil? || path.empty?

    if path.start_with?("/")
      File.join(site, path.delete_prefix("/"))
    else
      File.expand_path(path, File.dirname(html_path))
    end
  end

  def inside?(site, target)
    target == site || target.start_with?(site + "/")
  end

  def exists?(target)
    return true if File.file?(target)
    return true if File.file?(File.join(target, "index.html"))
    return true if File.file?(target + ".html")

    false
  end
end
