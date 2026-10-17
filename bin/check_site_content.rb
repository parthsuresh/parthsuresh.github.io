#!/usr/bin/env ruby
# frozen_string_literal: true

require "bundler/setup"
require_relative "site_content"

root = ARGV[0] || Dir.pwd
errors = SiteContent.check_repo(root)
errors.each { |error| warn error }
if errors.empty?
  warn "site content ok"
  exit 0
end

warn "#{errors.size} site content error(s)"
exit 1
