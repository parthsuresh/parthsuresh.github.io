#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative "local_links"

site = ARGV[0] || File.join(Dir.pwd, "_site")
errors = LocalLinks.check(site)
errors.each { |error| warn error }
if errors.empty?
  warn "local links ok"
  exit 0
end

warn "#{errors.size} broken local link(s)"
exit 1
