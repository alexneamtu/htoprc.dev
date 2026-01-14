-- Seed data for htoprc.dev
-- Sample htoprc configurations for development and testing

-- Default htop 3.x config (minimal customization)
INSERT OR IGNORE INTO configs (id, slug, title, content, content_hash, source_type, score, htop_version, status, likes_count, created_at)
VALUES (
  'seed-001',
  'default-htop-3x',
  'Default htop 3.x',
  'htop_version=3.2.1
config_reader_min_version=3
fields=0 48 17 18 38 39 40 2 46 47 49 1
hide_kernel_threads=1
hide_userland_threads=0
shadow_other_users=0
show_thread_names=0
show_program_path=1
highlight_base_name=0
highlight_deleted_exe=1
highlight_megabytes=1
highlight_threads=1
highlight_changes=0
highlight_changes_delay_secs=5
find_comm_in_cmdline=1
strip_exe_from_cmdline=1
show_merged_command=0
header_margin=1
screen_tabs=1
detailed_cpu_time=0
cpu_count_from_one=0
show_cpu_usage=1
show_cpu_frequency=0
show_cpu_temperature=0
degree_fahrenheit=0
update_process_names=0
account_guest_in_cpu_meter=0
color_scheme=0
enable_mouse=1
delay=15
hide_function_bar=0
header_layout=two_50_50
column_meters_0=LeftCPUs Memory Swap
column_meter_modes_0=1 1 1
column_meters_1=RightCPUs Tasks LoadAverage Uptime
column_meter_modes_1=1 2 2 2
tree_view=0
sort_key=46
tree_sort_key=0
sort_direction=-1
tree_sort_direction=1
tree_view_always_by_pid=0
all_branches_collapsed=0
screen:Main=PID USER PRIORITY NICE M_VIRT M_RESIDENT M_SHARE STATE PERCENT_CPU PERCENT_MEM TIME Command
.sort_key=PERCENT_CPU
.tree_sort_key=PID
.tree_view_always_by_pid=0
.tree_view=0
.sort_direction=-1
.tree_sort_direction=1
.all_branches_collapsed=0',
  'seed-hash-001',
  'seeded',
  5,
  '3.2.1',
  'published',
  0,
  datetime('now')
);

-- Colorful config with custom color scheme
INSERT OR IGNORE INTO configs (id, slug, title, content, content_hash, source_type, score, htop_version, status, likes_count, created_at)
VALUES (
  'seed-002',
  'dracula-theme',
  'Dracula Theme',
  'htop_version=3.2.1
config_reader_min_version=3
fields=0 48 17 18 38 39 40 2 46 47 49 1
hide_kernel_threads=1
hide_userland_threads=0
shadow_other_users=0
show_thread_names=0
show_program_path=1
highlight_base_name=1
highlight_deleted_exe=1
highlight_megabytes=1
highlight_threads=1
highlight_changes=0
color_scheme=5
enable_mouse=1
delay=15
header_layout=two_50_50
column_meters_0=AllCPUs2 Memory Swap
column_meter_modes_0=1 1 1
column_meters_1=Tasks LoadAverage Uptime Battery
column_meter_modes_1=2 2 2 2
tree_view=1
sort_key=46
sort_direction=-1',
  'seed-hash-002',
  'seeded',
  25,
  '3.2.1',
  'published',
  5,
  datetime('now', '-1 day')
);

-- Minimal server config
INSERT OR IGNORE INTO configs (id, slug, title, content, content_hash, source_type, score, htop_version, status, likes_count, created_at)
VALUES (
  'seed-003',
  'minimal-server',
  'Minimal Server Config',
  'htop_version=3.2.1
config_reader_min_version=3
fields=0 48 17 18 38 39 2 46 47 1
hide_kernel_threads=1
hide_userland_threads=1
shadow_other_users=1
show_thread_names=0
show_program_path=0
highlight_base_name=0
color_scheme=0
enable_mouse=0
delay=30
header_layout=one_100
column_meters_0=CPU Memory Swap LoadAverage Tasks
column_meter_modes_0=2 2 2 2 2
tree_view=0
sort_key=46
sort_direction=-1',
  'seed-hash-003',
  'seeded',
  15,
  '3.2.1',
  'published',
  2,
  datetime('now', '-2 days')
);

-- Developer workstation config with detailed view
INSERT OR IGNORE INTO configs (id, slug, title, content, content_hash, source_type, score, htop_version, status, likes_count, created_at)
VALUES (
  'seed-004',
  'developer-workstation',
  'Developer Workstation',
  'htop_version=3.2.1
config_reader_min_version=3
fields=0 48 17 18 38 39 40 2 46 47 49 111 1
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
highlight_changes_delay_secs=3
color_scheme=6
enable_mouse=1
delay=10
header_layout=two_50_50
column_meters_0=AllCPUs4 Memory DiskIO NetworkIO
column_meter_modes_0=1 1 2 2
column_meters_1=Tasks LoadAverage Uptime Systemd
column_meter_modes_1=2 2 2 2
tree_view=1
sort_key=46
sort_direction=-1',
  'seed-hash-004',
  'seeded',
  35,
  '3.2.1',
  'published',
  12,
  datetime('now', '-3 days')
);

-- htop 2.x legacy config
INSERT OR IGNORE INTO configs (id, slug, title, content, content_hash, source_type, score, htop_version, status, likes_count, created_at)
VALUES (
  'seed-005',
  'legacy-htop-2x',
  'Legacy htop 2.x Config',
  'htop_version=2.2.0
config_reader_min_version=2
fields=0 48 17 18 38 39 40 2 46 47 49 1
sort_key=46
sort_direction=-1
hide_threads=0
hide_kernel_threads=1
hide_userland_threads=0
shadow_other_users=0
show_thread_names=0
highlight_base_name=0
highlight_megabytes=1
highlight_threads=1
tree_view=0
header_margin=1
detailed_cpu_time=0
cpu_count_from_one=0
color_scheme=0
delay=15
left_meters=AllCPUs Memory Swap
left_meter_modes=1 1 1
right_meters=Tasks LoadAverage Uptime
right_meter_modes=2 2 2',
  'seed-hash-005',
  'seeded',
  10,
  '2.2.0',
  'published',
  1,
  datetime('now', '-7 days')
);
