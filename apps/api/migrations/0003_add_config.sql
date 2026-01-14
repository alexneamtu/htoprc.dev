-- Add System Monitor Pro config
INSERT OR IGNORE INTO configs (id, slug, title, content, content_hash, source_type, score, htop_version, status, likes_count, created_at)
VALUES (
  'seed-006',
  'system-monitor-pro',
  'System Monitor Pro',
  'htop_version=3.2.1
config_reader_min_version=3
fields=0 48 17 18 38 39 40 2 46 47 49 1
hide_kernel_threads=1
hide_userland_threads=0
shadow_other_users=0
show_thread_names=1
show_program_path=1
highlight_base_name=1
highlight_deleted_exe=1
highlight_megabytes=1
highlight_threads=1
highlight_changes=1
highlight_changes_delay_secs=2
color_scheme=3
enable_mouse=1
delay=10
header_layout=two_50_50
column_meters_0=AllCPUs8 Memory Swap
column_meter_modes_0=1 1 1
column_meters_1=Tasks LoadAverage Uptime Clock Hostname
column_meter_modes_1=2 2 2 2 2
tree_view=0
sort_key=46
sort_direction=-1',
  'seed-hash-006',
  'seeded',
  42,
  '3.2.1',
  'published',
  8,
  datetime('now')
);
