# frozen_string_literal: true

require "minitest/autorun"
require "tmpdir"
require "fileutils"
require_relative "../bin/site_content"

class SiteContentCheckTest < Minitest::Test
  ROOT = File.expand_path("..", __dir__)
  FIXTURES = File.join(__dir__, "fixtures/site_content")

  def test_duplicate_venue_year_fails_on_the_pre_fix_entries
    errors = SiteContent.bibliography_errors(File.join(FIXTURES, "duplicate_year.bib"))
    assert_equal 2, errors.size
    assert_includes errors.join("\n"), "chan2024balancing"
    assert_includes errors.join("\n"), "remove 2024 from the venue"
    assert_includes errors.join("\n"), "girija2018subband"
    assert_includes errors.join("\n"), "remove 2018 from the venue"
  end

  def test_current_bibliography_has_no_repeated_venue_year
    errors = SiteContent.bibliography_errors(File.join(ROOT, "_bibliography/papers.bib"), ROOT)
    venue = errors.select { |error| error.include?("remove") && error.include?("from the venue") }
    assert_empty venue
  end

  def test_em_dash_news_fails_on_the_pre_fix_sentence
    errors = SiteContent.news_file_errors(File.join(FIXTURES, "emdash_news.md"), "2510.26160")
    assert_equal 1, errors.size
    assert_includes errors[0], "Use a hyphen"
  end

  def test_scholar_snapshot_year_is_not_an_error
    Dir.mktmpdir do |dir|
      bib = File.join(dir, "papers.bib")
      citations = File.join(dir, "citations.yml")
      File.write(bib, <<~BIB)
        @inproceedings{wang2025cragmm,
          title = {CRAG-MM},
          author = {Suresh, Parth},
          booktitle = {Proceedings of the ACM SIGKDD Conference on Knowledge Discovery and Data Mining},
          year = {2026},
          pdf = {https://arxiv.org/abs/2510.26160},
          google_scholar_id = {zYLM7Y9cAGgC},
        }
      BIB
      File.write(citations, <<~YAML)
        papers:
          X_0IsZwAAAAJ:zYLM7Y9cAGgC:
            citations: 14
            title: CRAG-MM
            year: "2025"
      YAML
      errors = SiteContent.citation_errors(citations, bib)
      assert_empty errors
    end
  end

  def test_unknown_citation_id_fails
    Dir.mktmpdir do |dir|
      bib = File.join(dir, "papers.bib")
      citations = File.join(dir, "citations.yml")
      File.write(bib, <<~BIB)
        @article{one,
          title = {One},
          author = {Suresh, Parth},
          journal = {Example},
          year = {2024},
          pdf = {https://example.com/one.pdf},
          google_scholar_id = {abc123},
        }
      BIB
      File.write(citations, <<~YAML)
        papers:
          someone:einstein999:
            citations: 1
            title: Relativity
            year: "1905"
      YAML
      errors = SiteContent.citation_errors(citations, bib)
      assert_equal 1, errors.size
      assert_includes errors[0], "einstein999"
      assert_includes errors[0], "Delete the leftover citation"
    end
  end

  def test_homepage_title_must_stay_about
    Dir.mktmpdir do |dir|
      path = File.join(dir, "about.md")
      File.write(path, "---\nlayout: about\ntitle: Member of Technical Staff at Datology AI\n---\n\nBio\n")
      errors = SiteContent.about_errors(path)
      assert_equal 1, errors.size
      assert_includes errors[0], "Set title: about"
    end
  end

  def test_role_missing_from_prose_fails
    Dir.mktmpdir do |dir|
      about = File.join(dir, "about.md")
      exp = File.join(dir, "experience.yml")
      File.write(about, "---\ntitle: about\n---\n\nI'm a Member of Technical Staff at Datology AI.\n")
      File.write(exp, <<~YAML)
        roles:
          - id: datology
            current: true
            title: Member of Technical Staff
            organization: Datology AI
          - id: elsewhere
            title: Chief Example Officer
            organization: Example Corp
      YAML
      errors = SiteContent.experience_errors(exp, about)
      assert_equal 2, errors.size
      joined = errors.join("\n")
      assert_includes joined, "Chief Example Officer"
      assert_includes joined, "Example Corp"
    end
  end

  def test_extra_layout_override_fails
    Dir.mktmpdir do |root|
      Dir.mkdir(File.join(root, "_layouts"))
      File.write(File.join(root, "_layouts/about.liquid"), "")
      File.write(File.join(root, "_layouts/post.liquid"), "")
      errors = SiteContent.override_errors(root)
      assert_equal 1, errors.size
      assert_includes errors[0], "post.liquid"
      assert_includes errors[0], "about.liquid"
    end
  end

  def test_current_site_passes
    errors = SiteContent.check_repo(ROOT)
    assert_empty errors, errors.join("\n")
  end
end
