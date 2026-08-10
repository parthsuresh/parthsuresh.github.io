---
layout: page
title: news
permalink: /news/
nav: true
nav_order: 2
---

<style>
  /* table-borderless wins on border via CSS layers; box-shadow draws the row lines */
  .news table.table th,
  .news table.table td {
    box-shadow: inset 0 1px 0 0 var(--global-divider-color);
  }
</style>

{% include news.liquid %}
