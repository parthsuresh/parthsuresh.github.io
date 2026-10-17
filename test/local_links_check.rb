# frozen_string_literal: true

require "minitest/autorun"
require "tmpdir"
require "fileutils"
require_relative "../bin/local_links"

class LocalLinksCheckTest < Minitest::Test
  def test_missing_root_relative_page_fails
    Dir.mktmpdir do |site|
      FileUtils.mkdir_p(File.join(site, "assets/css"))
      File.write(File.join(site, "assets/css/main.css"), "body{}")
      File.write(File.join(site, "index.html"), <<~HTML)
        <link rel="stylesheet" href="/assets/css/main.css?v=abc">
        <a href="/publications/">Papers</a>
        <a href="https://example.com/skip">External</a>
      HTML
      errors = LocalLinks.check(site)
      assert_equal 1, errors.size
      assert_includes errors[0], "/publications/"
      assert_includes errors[0], "index.html"
    end
  end

  def test_query_string_still_finds_the_file
    Dir.mktmpdir do |site|
      FileUtils.mkdir_p(File.join(site, "publications"))
      File.write(File.join(site, "publications/index.html"), "<a href='/'>Home</a>")
      File.write(File.join(site, "index.html"), '<a href="/publications/?q=1">Papers</a>')
      assert_empty LocalLinks.check(site)
    end
  end

  def test_script_source_text_is_not_a_link
    Dir.mktmpdir do |site|
      File.write(File.join(site, "index.html"), '<script>var src="):g).split(n)";</script><a href="/">Home</a>')
      assert_empty LocalLinks.check(site)
    end
  end

  def test_built_site_has_no_broken_local_links
    site = File.expand_path("../_site", __dir__)
    skip "production _site is not built" unless File.file?(File.join(site, "index.html"))

    errors = LocalLinks.check(site)
    assert_empty errors, errors.first(8).join("\n")
  end
end
