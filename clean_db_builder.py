import datetime
import psycopg2
import keyring
import threading

# Configuration
EXTRA_FULL_ACCESS_PKGS = [3, 4, 5]
HIDE_PREDICATE = "AND TRIM(afw.hs_coach_hide) IS DISTINCT FROM '1'"

# Set to False after first run to skip source table indexing
CREATE_SOURCE_INDEXES = False

# Set to True to only refresh activity feed MV and views (skip full build)
REFRESH_ACTIVITY_FEED_ONLY = True

# Set to True to only create public views (skip MV creation)
CREATE_VIEWS_ONLY = False

# Athlete fact mapping
athlete_fact_mapping = {
    1: "year", 2: "primary_position", 4: "height_feet", 5: "height_inch", 6: "weight",
    7: "high_school", 8: "previous_schools", 10: "major", 13: "twitter", 15: "club",
    16: "hand", 23: "image_url", 24: "address_state", 25: "elig_remaining", 35: "gpa",
    37: "highlight", 234: "summer_league", 250: "survey_completed", 251: "is_receiving_athletic_aid",
    65: "faith_based_school", 634: 'track_wrestling_profile', 635: 'wrestle_stat_link',
    639: 'stats_url', 308: 'roster_year', 690: 'utr_link', 720: 'long_jump',
    698: 'college_career_score', 699: 'hs_career_score', 700: 'football_career_score',
    701: 'predicted_transfer_destination', 702: 'transfer_odds', 703: 'up_predictions',
    704: 'down_predictions', 705: 'flat_predictions', 706: 'risk_category', 707: 'pred_direction',
    729: 'rivals_rating', 739: 'shot_put', 761: 'forty', 762: 'shuttle', 763: 'three_cone',
    764: 'broad_jump', 765: 'vert_jump', 11: 'roster_link', 1026: 'athletic_projection',
    1015: 'grad_year', 38: 'hs_highlight', 1024: 'sat', 1025: 'act', 1035: 'gpa_type',
    1048: 'hs_coach_hide', 1059: 'best_offer', 1062: 'income', 1097: 'added_date',
    1098: 'last_major_change', 1065: 'on3_consensus_rating', 1073: 'on3_rating',
    1080: '_247_rating', 1087: 'espn_rating', 1064: 'on3_consensus_stars',
    1072: 'on3_stars', 1079: '_247_stars', 1086: 'espn_stars'
}

afw_numeric_fields = {
    "height_feet", "height_inch", "weight", "gpa", "roster_year", 'grad_year',
    'transfer_odds', 'sat', 'act'
}

# School fact mapping
school_fact_mapping = {
    116: "msoc_conference", 117: "school_type", 118: "athletic_association", 119: "division",
    120: "sub_division", 244: "bsb_conference", 247: "address_city", 252: "fbs_conf_group",
    253: "school_state", 254: "academic_ranking", 259: "conference", 260: "wbb_conference",
    261: "mbb_conference", 262: "wvol_conference", 263: "sb_conference", 264: "mlax_conference",
    265: "wlax_conference", 266: "mten_conference", 267: "wten_conference", 268: "mglf_conference",
    269: "wglf_conference", 270: "mtaf_conference", 271: "wtaf_conference", 272: "mswm_conference",
    273: "wswm_conference", 274: "mwre_conference", 276: "wsoc_conference", 648: "juco_region",
    649: "juco_division", 982: 'juco_has_football', 960: 'academics',
    696: "hc_name", 255: "hc_email", 907: "address_latitude", 908: "address_longitude",
    256: "hc_number", 961: "affiliation", 928: "private_public", 956: "college_player_producing",
    957: "d1_player_producing", 958: "team_quality", 959: "athlete_income", 966: "county_id"
}

sfw_numeric_fields = {
    "college_player_producing", "d1_player_producing", "team_quality",
    "athlete_income", "academics", "county_id", "address_longitude", "address_latitude"
}

ALLOWED_JUCO_SUFFIXES = {"wsoc", "msoc", "wvol", "wbb", "bsb"}

standard_redacted_columns = [
    "ncaa_id", "last_updated", "m_year", "m_division", "m_sport", "m_conference", "m_link", "sport_id",
    "athlete_first_name", "athlete_last_name", "athlete_knack_id", "athlete_created_at", "details_id",
    "ok_to_contact", "is_transfer_graduate_student", "is_receiving_athletic_aid", "is_recruited",
    "details_commit", "db_update", "expected_grad_date", "is_four_year_transfer", "athlete_survey_sent",
    "is_aid_cancelled", "comments", "details_link", "email", "year", "primary_position", "height_feet",
    "height_inch", "weight", "high_school", "previous_schools", "major", "twitter", "club", "hand",
    "image_url", "address_state", "elig_remaining", "gpa", "highlight", "summer_league", "survey_completed",
    "gp", "best_honor", "faith_based_school", "school_type", "athletic_association", "sub_division",
    "commit_school_id", "commit_school_name", "commit_date", "sign_school_id", "sign_school_name",
    'utr_link', 'long_jump', 'college_career_score', 'hs_career_score', 'football_career_score',
    'predicted_transfer_destination', 'transfer_odds', 'up_predictions', 'down_predictions', 'flat_predictions',
    'risk_category', 'pred_direction', 'rivals_rating', 'shot_put', 'forty', 'shuttle', 'three_cone',
    'broad_jump', 'vert_jump', 'roster_link', 'grad_year', 'sat', 'act', 'gpa_type', 'best_offer', 'income',
    'income_category', 'added_date', 'last_major_change', 'on3_consensus_rating', 'on3_rating', '_247_rating',
    'espn_rating', 'on3_consensus_stars', 'on3_stars', '_247_stars', 'espn_stars'
]

view_configs = [
    {
        "suffix": "fb",
        "sport_id": 21,
        "platinum_package_id": 1,
        "gold_package_id": 97,
        "old_gold_package_id": 98,
        "silver_plus_package_id": 99,
        "silver_package_id": 100,
        "naia_package_id": 101,
        "naia_plus_package_id": 103,
        "pg_silver_package_id": 105,
        "pg_gold_package_id": 104,
        "full_access_package_ids": [1, 97, 98, 99, 100, 101, 103],
        "redacted_columns": [
            "asst_tack", "tackles", "pdef", "net_ko_yds", "punts", "ko_ret", "ko_ret_yds", "rec", "rec_yds", "rec_td",
            "plays", "ograde", "stgrade", "rush_att", "rush_net_yds", "rush_tds", "solo_tack", "stfl", "atfl", "pbu",
            "ff", "dgrade", "sacks", "pass_att", "pass_comp", "pass_yds", "pass_tds", "pass_eff", "pass_pct",
            "punt_ret", "punt_ret_yds", "pass_int", "d_int", "int_yds", "ko", "ko_yds", "ko_tb", "fga_40_49",
            "fumbles_recovered", "punt_yds", "long_punt", "punts_50", "fgm_20_29", "fga_20_29", "fgm_30_39",
            "fga_30_39", "punt_tbs", "fgm_40_49", "fgm_50_59", "fga_50_59", "kick_ret_tds", "fgm_1_19", "fga_1_19",
            "punt_ret_tds", "fga_60", "fgm_60", "fc_yds"
        ]
    },
    {
        "suffix": "bsb",
        "sport_id": 6,
        "elite_package_id": 7,
        "ultra_package_id": 80,
        "naia_package_id": 10,
        "juco_package_id": 9,
        "starter_package_id": 8,
        "full_access_package_ids": [8, 7, 80, 10],
        "redacted_columns": [
            "ba", "ob_pct", "slg_pct", "r", "ab", "h", "2b", "3b", "tb", "hr", "rbi", "bb", "hbp", "sf", "sh", "k",
            "dp", "cs", "picked", "sb", "ibb", "rbi_2_out", "app", "era", "ip", "cg", "p_h", "p_r", "er", "p_bb",
            "so", "sho", "bf", "p_oab", "2b_a", "3b_a", "bk", "hr_a", "wp", "hb", "inh_run", "inh_run_score",
            "sha", "sfa", "pitches", "go", "fo", "w", "l", "saves", "kl", "po", "a", "tc", "e", "fld_pct", "ci", "pb",
            "sba", "csb", "idp", "whip", "ops", "p_so_bb", "hitter_bb_so", "woba", "woba_score", "fip", "fip_score",
            "ob", "so_per9", "bb_per9", "opp_dp", "gdp", "pickoffs", "tp", "sba_pct", "k_pct", "bb_pct", "p_so/bb", "xbh", "pa"
        ]
    },
    {
        "suffix": "sb",
        "sport_id": 7,
        "elite_package_id": 12,
        "ultra_package_id": 81,
        "naia_package_id": 14,
        "juco_package_id": 13,
        "starter_package_id": 11,
        "full_access_package_ids": [11, 12, 81, 14],
        "redacted_columns": [
            "ba", "ob_pct", "slg_pct", "r", "ab", "h", "2b", "3b", "tb", "hr", "rbi", "bb", "hbp", "sf", "sh", "k",
            "dp", "cs", "picked", "sb", "ibb", "rbi_2_out", "app", "era", "ip", "cg", "p_h", "p_r", "er", "p_bb",
            "so", "sho", "bf", "p_oab", "2b_a", "3b_a", "bk", "hr_a", "wp", "hb", "inh_run", "inh_run_score",
            "sha", "sfa", "pitches", "go", "fo", "w", "l", "saves", "kl", "po", "a", "tc", "e", "fld_pct", "ci", "pb",
            "sba", "csb", "idp", "whip", "ops", "p_so_bb", "hitter_bb_so", "woba", "woba_score", "fip", "fip_score",
            "ob", "so_per9", "bb_per9", "opp_dp", "gdp", "pickoffs", "tp", "cso", "cia", "sba_pct", "bb_pct", "p_so/bb"
        ]
    },
    {
        "suffix": "msoc",
        "sport_id": 3,
        "elite_package_id": 2,
        "ultra_package_id": 79,
        "naia_package_id": 73,
        "juco_package_id": 72,
        "starter_package_id": 71,
        "full_access_package_ids": [71, 2, 79, 73],
        "redacted_columns": [
            "gs", "ga", "gaa", "saves", "shutouts", "g_wins", "g_losses", "sv_pct", "d_saves", "goals", "goal_app",
            "assists", "points", "sh_att", "fouls", "red_cards", "yellow_cards", "pk", "pk_att", "corners", "gwg",
            "g_min_played", "sh_pct", "sog_pct", "g_ties", "cbo", "sog"
        ]
    },
    {
        "suffix": "wsoc",
        "sport_id": 4,
        "elite_package_id": 74,
        "ultra_package_id": 96,
        "naia_package_id": 77,
        "juco_package_id": 76,
        "starter_package_id": 75,
        "full_access_package_ids": [75, 74, 96, 77],
        "redacted_columns": [
            "gs", "ga", "gaa", "saves", "shutouts", "g_wins", "g_losses", "sv_pct", "d_saves", "goals", "goal_app",
            "assists", "points", "sh_att", "fouls", "red_cards", "yellow_cards", "pk", "pk_att", "corners", "gwg",
            "g_min_played", "min_played", "sh_pct", "sog_pct", "g_ties", "cbo", "sog"
        ]
    },
    {
        "suffix": "wbb",
        "sport_id": 2,
        "elite_package_id": 16,
        "ultra_package_id": 82,
        "naia_package_id": 18,
        "juco_package_id": 17,
        "starter_package_id": 15,
        "full_access_package_ids": [15, 16, 82, 18],
        "redacted_columns": [
            "min_played", "fgm", "fga", "fg_pct", "3fg", "3fga", "3fg_pct", "ft", "fta", "ft_pct", "points", "ppg",
            "orebs", "drebs", "tot_reb", "assists", "to", "stl", "blk", "pf", "dq", "dbl_dbl", "tech_fouls", "bench",
            "bench_pts_pg", "height", "gmbpm", "gmbpm_score", "rpg", "apg", "mpg", "fpg", "to_pg", "stl_pg", "blk_pg"
        ]
    },
    {
        "suffix": "mbb",
        "sport_id": 1,
        "elite_package_id": 20,
        "ultra_package_id": 83,
        "naia_package_id": 22,
        "juco_package_id": 21,
        "starter_package_id": 19,
        "full_access_package_ids": [19, 20, 83, 22],
        "redacted_columns": [
            "min_played", "fgm", "fga", "fg_pct", "3fg", "3fga", "3fg_pct", "ft", "fta", "ft_pct", "points", "ppg",
            "orebs", "drebs", "tot_reb", "assists", "to", "stl", "blk", "pf", "dq", "dbl_dbl", "tech_fouls", "bench",
            "bench_pts_pg", "height", "effective_fg_pct", "gmbpm", "gmbpm_score", "rpg", "apg", "mpg", "fpg", "to_pg",
            "stl_pg", "blk_pg"
        ]
    },
    {
        "suffix": "wvol",
        "sport_id": 5,
        "elite_package_id": 24,
        "ultra_package_id": 84,
        "naia_package_id": 26,
        "juco_package_id": 25,
        "starter_package_id": 23,
        "full_access_package_ids": [23, 24, 84, 26],
        "redacted_columns": [
            "gs", "goals", "assists", "points", "sh_att", "sog", "gb", "ct", "fo_won", "fos_taken", "g_min_played",
            "ga", "saves", "sv_pct", "to", "re", "ms", "s_pct", "kps"
        ]
    },
    {
        "suffix": "mtaf",
        "sport_id": 16,
        "elite_package_id": 52,
        "ultra_package_id": 91,
        "naia_package_id": 54,
        "juco_package_id": 53,
        "starter_package_id": 51,
        "full_access_package_ids": [51, 52, 91, 54],
        "redacted_columns": [
            "100_m", "200_m", "400_m", "60_h", "110_h", "400_h", "lj", "6k_xc", "600_m", "800_m", "1500_m", "mile",
            "3000_m", "5000_m", "8k_xc", "10k_xc", "3000_s", "55_m", "500_m", "5k_xc", "5_mile_xc", "60_m", "1000_m",
            "hj", "pv", "sp", "discus", "javelin", "hep", "dec", "tj", "hammer", "weight_throw", "4_mile_xc", "300_m", "10000_m"
        ]
    },
    {
        "suffix": "wtaf",
        "sport_id": 17,
        "elite_package_id": 56,
        "ultra_package_id": 92,
        "naia_package_id": 58,
        "juco_package_id": 57,
        "starter_package_id": 55,
        "full_access_package_ids": [55, 56, 92, 58],
        "redacted_columns": [
            "100_m", "200_m", "400_m", "60_h", "400_h", "lj", "6k_xc", "600_m", "800_m", "1500_m", "mile", "3000_m",
            "5000_m", "8k_xc", "10k_xc", "3000_s", "5k_xc", "5_mile_xc", "60_m", "1000_m", "hj", "pv", "sp", "discus",
            "javelin", "hep", "tj", "hammer", "weight_throw", "4_mile_xc", "300_m", "55_m", "500_m", "100_h", "10000_m"
        ]
    },
    {
        "suffix": "mten",
        "sport_id": 14,
        "elite_package_id": 36,
        "ultra_package_id": 87,
        "naia_package_id": 38,
        "juco_package_id": 37,
        "starter_package_id": 35,
        "full_access_package_ids": [35, 36, 87, 38],
        "redacted_columns": ["rank", "utr_singles", "utr_doubles", "wtn_singles_number", "wtn_doubles_number"]
    },
    {
        "suffix": "wten",
        "sport_id": 15,
        "elite_package_id": 40,
        "ultra_package_id": 88,
        "naia_package_id": 42,
        "juco_package_id": 41,
        "starter_package_id": 39,
        "full_access_package_ids": [39, 40, 88, 42],
        "redacted_columns": ["rank", "utr_singles", "utr_doubles", "wtn_singles_number", "wtn_doubles_number"]
    },
    {
        "suffix": "mlax",
        "sport_id": 12,
        "elite_package_id": 28,
        "ultra_package_id": 85,
        "naia_package_id": 30,
        "juco_package_id": 29,
        "starter_package_id": 27,
        "full_access_package_ids": [27, 28, 85, 30],
        "redacted_columns": [
            "gs", "goals", "assists", "points", "sh_att", "sog", "gb", "ct", "fo_won", "fos_taken", "g_min_played",
            "ga", "saves", "sv_pct", "to"
        ]
    },
    {
        "suffix": "wlax",
        "sport_id": 13,
        "elite_package_id": 32,
        "ultra_package_id": 86,
        "naia_package_id": 34,
        "juco_package_id": 33,
        "starter_package_id": 31,
        "full_access_package_ids": [31, 32, 86, 34],
        "redacted_columns": [
            "fouls", "gs", "goals", "assists", "points", "sh_att", "sog", "gb", "ct", "freepos_shots", "freepos_goals",
            "rc", "yc", "gc", "draw_controls", "g_min_played", "ga", "gaa", "saves", "sv_pct", "to"
        ]
    },
    {
        "suffix": "mglf",
        "sport_id": 10,
        "elite_package_id": 44,
        "ultra_package_id": 89,
        "naia_package_id": 46,
        "juco_package_id": 45,
        "starter_package_id": 43,
        "full_access_package_ids": [43, 44, 89, 46],
        "redacted_columns": [
            "rank", "points_average", "divisor", "applied_divisor", "best_rank", "wins", "top_10_finishes"
        ]
    },
    {
        "suffix": "wglf",
        "sport_id": 11,
        "elite_package_id": 48,
        "ultra_package_id": 90,
        "naia_package_id": 50,
        "juco_package_id": 49,
        "starter_package_id": 47,
        "full_access_package_ids": [47, 48, 90, 50],
        "redacted_columns": [
            "rank", "points_average", "divisor", "applied_divisor", "best_rank", "wins", "top_10_finishes"
        ]
    },
    {
        "suffix": "mswm",
        "sport_id": 18,
        "elite_package_id": 60,
        "ultra_package_id": 93,
        "naia_package_id": 62,
        "juco_package_id": 61,
        "starter_package_id": 59,
        "full_access_package_ids": [59, 60, 93, 62],
        "redacted_columns": [
            "50_y_free_time", "50_s_free_time", "50_l_free_time", "100_y_free_time", "100_s_free_time", "100_l_free_time",
            "200_y_free_time", "200_s_free_time", "200_l_free_time", "400_y_free_time", "400_s_free_time", "400_l_free_time",
            "500_y_free_time", "800_s_free_time", "800_l_free_time", "1000_y_free_time", "1500_l_free_time", "1650_y_free_time",
            "50_y_back_time", "50_s_back_time", "50_l_back_time", "100_y_back_time", "100_s_back_time", "100_l_back_time",
            "200_y_back_time", "200_s_back_time", "200_l_back_time", "50_y_breast_time", "50_s_breast_time", "50_l_breast_time",
            "100_y_breast_time", "100_s_breast_time", "100_l_breast_time", "200_y_breast_time", "200_s_breast_time", "200_l_breast_time",
            "50_y_fly_time", "50_s_fly_time", "50_l_fly_time", "100_y_fly_time", "100_s_fly_time", "100_l_fly_time",
            "200_y_fly_time", "200_s_fly_time", "200_l_fly_time", "75_y_im_time", "100_y_im_time", "100_s_im_time",
            "200_y_im_time", "200_s_im_time", "200_l_im_time", "400_y_im_time", "400_s_im_time", "400_l_im_time",
            "swimcloud_score", "qual_events"
        ]
    },
    {
        "suffix": "wswm",
        "sport_id": 19,
        "elite_package_id": 64,
        "ultra_package_id": 94,
        "naia_package_id": 66,
        "juco_package_id": 65,
        "starter_package_id": 63,
        "full_access_package_ids": [63, 64, 94, 66],
        "redacted_columns": [
            "50_y_free_time", "50_s_free_time", "50_l_free_time", "100_y_free_time", "100_s_free_time", "100_l_free_time",
            "200_y_free_time", "200_s_free_time", "200_l_free_time", "400_y_free_time", "400_s_free_time", "400_l_free_time",
            "500_y_free_time", "800_s_free_time", "800_l_free_time", "1000_y_free_time", "1500_l_free_time", "1650_y_free_time",
            "50_y_back_time", "50_s_back_time", "50_l_back_time", "100_y_back_time", "100_s_back_time", "100_l_back_time",
            "200_y_back_time", "200_s_back_time", "200_l_back_time", "50_y_breast_time", "50_s_breast_time", "50_l_breast_time",
            "100_y_breast_time", "100_s_breast_time", "100_l_breast_time", "200_y_breast_time", "200_s_breast_time", "200_l_breast_time",
            "50_y_fly_time", "50_s_fly_time", "50_l_fly_time", "100_y_fly_time", "100_s_fly_time", "100_l_fly_time",
            "200_y_fly_time", "200_s_fly_time", "200_l_fly_time", "75_y_im_time", "100_y_im_time", "100_s_im_time",
            "200_y_im_time", "200_s_im_time", "200_l_im_time", "400_y_im_time", "400_s_im_time", "400_l_im_time",
            "swimcloud_score", "qual_events"
        ]
    },
    {
        "suffix": "mwre",
        "sport_id": 20,
        "elite_package_id": 68,
        "ultra_package_id": 95,
        "naia_package_id": 70,
        "juco_package_id": 69,
        "starter_package_id": 67,
        "full_access_package_ids": [67, 68, 95, 70],
        "redacted_columns": [
            "weight_class_rank", "weight_class", "ws_elo", "win_pct", "bonus_pct", "rpi", "rank"
        ]
    }
]

# Athlete stat mapping
athlete_stat_mapping = {
    84: 'min_played', 98: "gp", 155: "ba", 156: "ob_pct", 157: "slg_pct", 158: "r",
    159: "ab", 160: "h", 161: "2b", 162: "3b", 163: "tb", 164: "hr", 165: "rbi",
    166: "bb", 167: "hbp", 168: "sf", 169: "sh", 170: "k", 171: "dp", 172: "cs",
    173: "picked", 174: "sb", 175: "ibb", 176: "rbi_2_out", 177: "app", 178: "era",
    179: "ip", 180: "cg", 181: "p_h", 182: "p_r", 183: "er", 184: "p_bb", 185: "so",
    186: "sho", 187: "bf", 188: "p_oab", 189: "2b_a", 190: "3b_a", 191: "bk",
    192: "hr_a", 193: "wp", 194: "hb", 195: "inh_run", 196: "inh_run_score",
    197: "sha", 198: "sfa", 199: "pitches", 200: "go", 201: "fo", 202: "w", 203: "l",
    205: "kl", 206: "po", 207: "a", 208: "tc", 209: "e", 210: "fld_pct", 211: "ci",
    212: "pb", 213: "sba", 214: "csb", 215: "idp", 218: "p_so/bb", 220: "woba",
    221: "woba_score", 222: "fip", 223: "fip_score", 224: "ob", 237: "opp_dp",
    238: "gdp", 239: "pickoffs", 240: "tp", 241: "sba_pct", 257: "cso", 258: "cia",
    278: "fgm", 279: "fga", 280: "fg_pct", 281: "3fg", 282: "3fga", 283: "3fg_pct",
    284: "ft", 285: "fta", 286: "ft_pct", 288: "ppg", 289: "orebs", 290: "drebs",
    291: "tot_reb", 294: "to", 295: "stl", 296: "blk", 297: "pf", 299: "dq",
    300: "dbl_dbl", 301: "tech_fouls", 302: "bench", 303: "bench_pts_pg", 304: "height",
    305: "gp_bpm", 307: "effective_fg_pct", 314: "100_m", 315: "200_m", 316: "400_m",
    317: "60_h", 318: "110_h", 319: "400_h", 320: "lj", 321: "6k_xc", 322: "600_m",
    323: "800_m", 324: "1500_m", 325: "mile", 326: "3000_m", 327: "5000_m",
    328: "8k_xc", 329: "10k_xc", 330: "3000_s", 331: "5k_xc", 332: "5_mile_xc",
    333: "60_m", 334: "1000_m", 335: "hj", 336: "pv", 337: "sp", 338: "discus",
    339: "javelin", 340: "hep", 341: "dec", 342: "tj", 343: "hammer", 344: "weight_throw",
    345: "4_mile_xc", 346: "300_m", 347: "55_m", 348: "500_m", 349: "100_h",
    350: "sets", 351: "kills", 352: "err", 353: "attacks", 354: "hit_pct", 355: "aces",
    356: "s_err", 357: "digs", 358: "ret_att", 359: "blk_solo", 360: "blk_assist",
    361: "b_err", 362: "trp_dbl", 363: "g_min_played", 367: "sog", 368: "gb",
    370: "ct", 371: "fo_won", 372: "fos_taken", 373: "gmbpm", 374: "gmbpm_score",
    83: "gs", 82: "goal_app", 85: "ga", 86: "gaa", 87: "saves", 88: "shutouts",
    89: "g_wins", 90: "g_losses", 91: "sv_pct", 92: "d_saves", 100: "goals",
    101: "assists", 102: "points", 103: "sh_att", 104: "fouls", 105: "red_cards",
    106: "yellow_cards", 107: "pk", 108: "pk_att", 109: "corners", 110: "gwg",
    375: "freepos_shots", 376: "freepos_goals", 377: "rc", 378: "yc", 379: "gc",
    380: "draw_controls", 381: "rank", 382: "points_average", 383: "divisor",
    384: "applied_divisor", 387: "best_rank", 388: "wins", 389: "top_10_finishes",
    392: "utr_singles", 394: "wtn_singles_number", 395: "wtn_doubles_number",
    396: "50_y_free_time", 399: "50_s_free_time", 402: "50_l_free_time",
    405: "100_y_free_time", 408: "100_s_free_time", 411: "100_l_free_time",
    414: "200_y_free_time", 417: "200_s_free_time", 420: "200_l_free_time",
    423: "400_y_free_time", 426: "400_s_free_time", 429: "400_l_free_time",
    432: "500_y_free_time", 435: "800_s_free_time", 438: "800_l_free_time",
    441: "1000_y_free_time", 444: "1500_l_free_time", 447: "1650_y_free_time",
    450: "50_y_back_time", 453: "50_s_back_time", 456: "50_l_back_time",
    459: "100_y_back_time", 462: "100_s_back_time", 465: "100_l_back_time",
    468: "200_y_back_time", 471: "200_s_back_time", 474: "200_l_back_time",
    477: "50_y_breast_time", 480: "50_s_breast_time", 483: "50_l_breast_time",
    486: "100_y_breast_time", 489: "100_s_breast_time", 492: "100_l_breast_time",
    495: "200_y_breast_time", 498: "200_s_breast_time", 501: "200_l_breast_time",
    504: "50_y_fly_time", 507: "50_s_fly_time", 510: "50_l_fly_time",
    513: "100_y_fly_time", 516: "100_s_fly_time", 519: "100_l_fly_time",
    522: "200_y_fly_time", 525: "200_s_fly_time", 528: "200_l_fly_time",
    531: "75_y_im_time", 534: "100_y_im_time", 537: "100_s_im_time",
    540: "200_y_im_time", 543: "200_s_im_time", 546: "200_l_im_time",
    549: "400_y_im_time", 552: "400_s_im_time", 555: "400_l_im_time",
    558: "swimcloud_score", 559: "weight_class_rank", 560: "weight_class",
    561: "ws_elo", 562: "win_pct", 563: "bonus_pct", 564: "rpi", 566: "r_err",
    567: "bhe", 568: "10000_m", 627: 'qual_events', 630: 'xbh', 640: 'sh_pct',
    641: 'sog_pct', 642: 'g_ties', 643: 'cbo', 644: 're', 645: 'ms', 646: 's_pct',
    647: 'pa', 689: "utr_doubles", 691: 'asst_tack', 692: 'tackles', 708: 'pdef',
    709: 'net_ko_yds', 710: 'punts', 711: 'ko_ret', 712: 'ko_ret_yds', 713: 'rec',
    714: 'rec_yds', 715: 'rec_td', 717: 'plays', 718: 'ograde', 719: 'stgrade',
    721: 'rush_att', 722: 'rush_net_yds', 723: 'rush_tds', 724: 'solo_tack',
    725: 'stfl', 726: 'atfl', 727: 'pbu', 728: 'ff', 730: 'dgrade', 731: 'sacks',
    732: 'pass_att', 733: 'pass_comp', 734: 'pass_int', 735: 'pass_yds',
    736: 'pass_tds', 737: 'pass_eff', 738: 'pass_pct', 740: 'punt_ret',
    741: 'punt_ret_yds', 742: 'd_int', 743: 'int_yds', 744: 'ko', 745: 'ko_yds',
    746: 'ko_tb', 747: 'fga_40_49', 748: 'fumbles_recovered', 749: 'punt_yds',
    750: 'long_punt', 751: 'punts_50', 752: 'fgm_20_29', 753: 'fga_20_29',
    754: 'fgm_30_39', 755: 'fga_30_39', 756: 'punt_tbs', 757: 'fgm_40_49',
    758: 'fgm_50_59', 759: 'fga_50_59', 760: 'kick_ret_tds', 766: 'fgm_1_19',
    767: 'fga_1_19', 768: 'punt_ret_tds', 769: 'fga_60', 770: 'fgm_60', 771: 'fc_yds'
}

# Core materialized views to build
CORE_MVS = [
    "latest_athlete_facts",
    "mv_athlete_fact_wide",
    "mv_athlete_stat_wide",
    "mv_school_fact_wide",
    "mv_athlete_honor_best",
    "mv_athlete_commit",
    "mv_athlete_sign",
    "mv_tp_athletes_wide",
    "mv_college_athletes_wide",
    "mv_hs_athletes_wide",
    "mv_juco_athletes_wide",
    "mv_activity_feed"
]

# Thread-safe print function
print_lock = threading.Lock()


def safe_print(*args, **kwargs):
    with print_lock:
        print(*args, **kwargs)


def get_conn():
    """Get database connection with autocommit enabled."""
    db_password = keyring.get_password('supabase', 'db_password')
    conn = psycopg2.connect(
        host="db.ljmvmaidepqbiyjvxoyo.supabase.co",
        port=5432,
        database="postgres",
        user="postgres",
        password=db_password
    )
    conn.autocommit = True
    return conn


def run_sql(stmt: str):
    """Execute a single SQL statement."""
    stmt = stmt.strip()
    if not stmt:
        return

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Set timeout for non-CONCURRENTLY statements
            if " CONCURRENTLY " not in stmt.upper():
                cur.execute("SET statement_timeout TO '1200000';")  # 20 min

            cur.execute(stmt)
    except Exception as e:
        safe_print(f"[ERROR] SQL execution failed: {e}")
        safe_print(f"[ERROR] Statement was: {stmt}")
        raise
    finally:
        conn.close()


def run_sql_no_timeout(stmt: str):
    """Execute SQL with no timeout (for long REFRESH operations)."""
    stmt = stmt.strip()
    if not stmt:
        return

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout TO 0;")
            cur.execute("SET lock_timeout TO 0;")
            cur.execute("SET work_mem TO '256MB';")
            cur.execute(stmt)
    finally:
        conn.close()


def ids_in_clause_from(mapping: dict) -> str:
    """Return a SQL-ready IN (...) list from a mapping's integer keys, sorted."""
    return ", ".join(str(k) for k in sorted(mapping.keys()))


def build_case_lines(mapping: dict, source_alias: str = "") -> str:
    """Build CASE WHEN lines for pivot operations."""
    prefix = f"{source_alias}." if source_alias else ""
    lines = []
    for dtid, col in mapping.items():
        col_escaped = f'"{col}"' if not col.isidentifier() else col
        lines.append(f" MAX(CASE WHEN {prefix}data_type_id = {dtid} THEN {prefix}value END) AS {col_escaped}")
    return ",\n".join(lines)


def build_cast_line(prefix, col):
    """Build safe numeric cast line."""
    no_cast_fields = {"b_t"}
    col_escaped = f'"{col}"' if not col.isidentifier() else col
    field = f"{prefix}.{col_escaped}"
    if col in no_cast_fields:
        return field
    else:
        return f"CASE WHEN {field} ~ '^-?\\d+(\\.\\d+)?$' THEN {field}::NUMERIC END AS {col_escaped}"


def safe_numeric_from_text(field_sql: str, alias_sql: str) -> str:
    """Safe numeric conversion from text."""
    return (
        f"CASE WHEN NULLIF(TRIM({field_sql}), '') ~ '^-?\\d+(\\.\\d+)?$' "
        f"THEN (NULLIF(TRIM({field_sql}), '')::NUMERIC) "
        f"ELSE NULL END AS {alias_sql}"
    )


def build_school_fact_select_block():
    """Build school fact select block with proper casting."""
    cols_skip = {"hc_name", "hc_email", "hc_number"}
    parts = []
    for col in school_fact_mapping.values():
        if col in cols_skip:
            continue
        q = f'"{col}"' if not col.isidentifier() else col
        if col in sfw_numeric_fields:
            parts.append(safe_numeric_from_text(f"p.{q}", q))
        else:
            parts.append(f"p.{q}")
    return ",\n ".join(parts)


def create_materialized_views():
    """Create all materialized views with DROP/CREATE approach."""

    # Latest athlete facts
    _AF_IDS_SQL = ids_in_clause_from(athlete_fact_mapping)

    latest_athlete_facts_drop = "DROP MATERIALIZED VIEW IF EXISTS intermediate.latest_athlete_facts CASCADE;"
    latest_athlete_facts_create = f"""
    CREATE MATERIALIZED VIEW intermediate.latest_athlete_facts AS
    SELECT DISTINCT ON (athlete_id, data_type_id) 
        athlete_id, data_type_id, value 
    FROM athlete_fact 
    WHERE inactive IS NULL 
        AND data_type_id IN ({_AF_IDS_SQL})
    ORDER BY athlete_id, data_type_id, created_at DESC
    WITH DATA;
    """

    # Athlete fact wide
    athlete_fact_wide_drop = "DROP MATERIALIZED VIEW IF EXISTS intermediate.mv_athlete_fact_wide CASCADE;"
    athlete_fact_wide_create = f"""
    CREATE MATERIALIZED VIEW intermediate.mv_athlete_fact_wide AS
    WITH base AS (
        SELECT athlete_id, {build_case_lines(athlete_fact_mapping)}
        FROM intermediate.latest_athlete_facts
        GROUP BY athlete_id
    )
    SELECT b.*,
        CASE 
            WHEN NULLIF(TRIM(b.income), '') ~ '^-?\\d+(\\.\\d+)?$' THEN
                CASE 
                    WHEN (NULLIF(TRIM(b.income), '')::NUMERIC) < 50000 THEN 'Low EFC'
                    WHEN (NULLIF(TRIM(b.income), '')::NUMERIC) < 100000 THEN 'Average EFC'
                    WHEN (NULLIF(TRIM(b.income), '')::NUMERIC) < 150000 THEN 'High EFC'
                    ELSE 'Very High EFC'
                END
            ELSE NULL
        END AS income_category
    FROM base b
    WITH DATA;
    """

    # Athlete stat wide
    athlete_stat_wide_drop = "DROP MATERIALIZED VIEW IF EXISTS intermediate.mv_athlete_stat_wide CASCADE;"
    athlete_stat_wide_create = f"""
    CREATE MATERIALIZED VIEW intermediate.mv_athlete_stat_wide AS
    WITH juco_flag AS (
        SELECT a.id AS athlete_id, a.sport_id,
            EXISTS (
                SELECT 1 FROM athlete_school aths
                JOIN intermediate.mv_school_fact_wide scw ON scw.school_id = aths.school_id
                WHERE aths.athlete_id = a.id 
                    AND aths.end_date IS NULL 
                    AND scw.school_type ILIKE 'junior college'
            ) AS is_juco
        FROM athlete a
    ),
    season_pref AS (
        SELECT j.athlete_id, sss.season
        FROM juco_flag j
        JOIN public.sport_season_selector sss ON sss.sport_id = j.sport_id AND sss.is_juco = j.is_juco
    ),
    latest_stat AS (
        SELECT s.athlete_id, s.data_type_id, s.value
        FROM stat s
        JOIN season_pref sp ON sp.athlete_id = s.athlete_id AND sp.season = s.season
        WHERE s.game_id IS NULL
    )
    SELECT athlete_id, {build_case_lines(athlete_stat_mapping)}
    FROM latest_stat
    GROUP BY athlete_id
    WITH DATA;
    """

    # School fact wide
    sfw_block = build_school_fact_select_block()
    school_fact_wide_drop = "DROP MATERIALIZED VIEW IF EXISTS intermediate.mv_school_fact_wide CASCADE;"
    school_fact_wide_create = f"""
    CREATE MATERIALIZED VIEW intermediate.mv_school_fact_wide AS
    WITH latest_school_facts AS (
        SELECT DISTINCT ON (school_id, data_type_id) 
            school_id, data_type_id, value
        FROM school_fact 
        WHERE inactive IS NULL
        ORDER BY school_id, data_type_id, created_at DESC
    ),
    pivoted AS (
        SELECT s.school_id, sch.name AS school_name,
            {build_case_lines(school_fact_mapping, source_alias="s")}
        FROM latest_school_facts s
        LEFT JOIN school sch ON sch.id = s.school_id
        GROUP BY s.school_id, sch.name
    )
    SELECT p.school_id, p.school_name,
        {sfw_block},
        st.name AS hs_state,
        CASE WHEN v.coach_id IS NOT NULL THEN (v.first_name || ' ' || v.last_name) ELSE p.hc_name END AS hc_name,
        CASE WHEN v.coach_id IS NOT NULL THEN COALESCE(v.coach_facts_json->>'email', v.coach_facts_json->>'work_email') ELSE p.hc_email END AS hc_email,
        CASE WHEN v.coach_id IS NOT NULL THEN COALESCE(
            v.coach_facts_json->>'phone', 
            v.coach_facts_json->>'mobile', 
            v.coach_facts_json->>'cell'
        ) ELSE p.hc_number END AS hc_number,
        CASE WHEN c.id IS NOT NULL AND st.abbrev IS NOT NULL THEN c.name || ' (' || st.abbrev || ')'
             WHEN c.id IS NOT NULL THEN c.name
             ELSE NULL END AS hs_county
    FROM pivoted p
    LEFT JOIN county c ON c.id = p.county_id::bigint
    LEFT JOIN state st ON st.id = c.state_id
    LEFT JOIN public.vw_school_active_coach_with_facts v ON v.school_id = p.school_id AND v.sport_id = 21
    WITH DATA;
    """

    # Additional MVs (simplified versions)
    athlete_honor_best_drop = "DROP MATERIALIZED VIEW IF EXISTS intermediate.mv_athlete_honor_best CASCADE;"
    athlete_honor_best_create = """
    CREATE MATERIALIZED VIEW intermediate.mv_athlete_honor_best AS
    WITH ranked_honors AS (
        SELECT athlete_id, award,
            CASE 
                WHEN award = 'All American' THEN 1
                WHEN award = 'All Region' THEN 2
                WHEN award = 'All Conference' THEN 3
                WHEN award = 'Rookie All Conference' THEN 4
                ELSE 99
            END AS honor_rank
        FROM athlete_honor
        WHERE award IN ('All American', 'All Region', 'All Conference', 'Rookie All Conference')
    ),
    best_honors AS (
        SELECT DISTINCT ON (athlete_id) athlete_id, award AS best_honor
        FROM ranked_honors
        ORDER BY athlete_id, honor_rank
    )
    SELECT athlete_id, best_honor FROM best_honors
    WITH DATA;
    """

    athlete_commit_drop = "DROP MATERIALIZED VIEW IF EXISTS intermediate.mv_athlete_commit CASCADE;"
    athlete_commit_create = """
    CREATE MATERIALIZED VIEW intermediate.mv_athlete_commit AS
    WITH latest_commit AS (
        SELECT DISTINCT ON (athlete_id) athlete_id, school_id, created_at
        FROM offer
        WHERE type = 'commit'
        ORDER BY athlete_id, created_at DESC
    )
    SELECT lc.athlete_id, lc.school_id, lc.created_at, s.name AS commit_school_name
    FROM latest_commit lc
    JOIN school s ON s.id = lc.school_id
    WITH DATA;
    """

    athlete_sign_drop = "DROP MATERIALIZED VIEW IF EXISTS intermediate.mv_athlete_sign CASCADE;"
    athlete_sign_create = """
    CREATE MATERIALIZED VIEW intermediate.mv_athlete_sign AS
    WITH latest_sign AS (
        SELECT DISTINCT ON (athlete_id) athlete_id, school_id, created_at
        FROM offer
        WHERE type = 'signed'
        ORDER BY athlete_id, created_at DESC
    )
    SELECT ls.athlete_id, ls.school_id, ls.created_at, s.name AS sign_school_name
    FROM latest_sign ls
    JOIN school s ON s.id = ls.school_id
    WITH DATA;
    """

    # Define afw_block and asw_block for materialized views
    afw_lines = [build_cast_line("afw", col) if col in afw_numeric_fields else f"afw.{col}"
                 for col in athlete_fact_mapping.values() if col != "is_receiving_athletic_aid"]
    afw_lines.append("afw.income_category")
    afw_block = ",\n        ".join(afw_lines)

    asw_lines = [build_cast_line("asw", col) for col in athlete_stat_mapping.values()]
    asw_lines += [
        "(CAST(asw.p_bb AS NUMERIC) + CAST(asw.p_h AS NUMERIC)) / NULLIF(CAST(c.ip_decimal AS NUMERIC), 0) AS whip",
        "CAST(asw.ob_pct AS NUMERIC) + CAST(asw.slg_pct AS NUMERIC) AS ops",
        "CAST(asw.so AS NUMERIC) / NULLIF(CAST(asw.p_bb AS NUMERIC), 0) AS p_so_bb",
        "CAST(asw.bb AS NUMERIC) / NULLIF(CAST(asw.k AS NUMERIC), 0) AS hitter_bb_so",
        "(CAST(asw.so AS NUMERIC) / NULLIF(CAST(asw.gp AS NUMERIC),0)) * 9 AS so_per9",
        "(CAST(asw.p_bb AS NUMERIC) / NULLIF(CAST(asw.gp AS NUMERIC),0)) * 9 AS bb_per9",
        "(CAST(asw.so AS NUMERIC) / NULLIF(CAST(asw.bf AS NUMERIC),0)) AS k_pct",
        "(CAST(asw.p_bb AS NUMERIC) / NULLIF(CAST(asw.bf AS NUMERIC),0)) AS bb_pct",
        '(CAST(asw."tot_reb" AS NUMERIC) / NULLIF(CAST(asw.gp AS NUMERIC),0)) AS rpg',
        "(CAST(asw.assists AS NUMERIC) / NULLIF(CAST(asw.gp AS NUMERIC),0)) AS apg",
        "(CAST(asw.min_played AS NUMERIC) / NULLIF(CAST(asw.gp AS NUMERIC),0)) AS mpg",
        "(CAST(asw.pf AS NUMERIC) / NULLIF(CAST(asw.gp AS NUMERIC),0)) AS fpg",
        "(CAST(asw.to AS NUMERIC) / NULLIF(CAST(asw.gp AS NUMERIC),0)) AS to_pg",
        "(CAST(asw.stl AS NUMERIC) / NULLIF(CAST(asw.gp AS NUMERIC),0)) AS stl_pg",
        "(CAST(asw.blk AS NUMERIC) / NULLIF(CAST(asw.gp AS NUMERIC),0)) AS blk_pg",
        "(CAST(asw.kills AS NUMERIC) / NULLIF(CAST(asw.sets AS NUMERIC),0)) AS kps",
    ]
    asw_block = ",\n        ".join(asw_lines)

    # Additional missing MVs that public views depend on - using original logic
    mv_tp_athletes_wide_drop = "DROP MATERIALIZED VIEW IF EXISTS intermediate.mv_tp_athletes_wide CASCADE;"
    mv_tp_athletes_wide_create = f"""
    CREATE MATERIALIZED VIEW intermediate.mv_tp_athletes_wide AS
    WITH converted AS (
        SELECT *, 
            FLOOR(CAST(ip AS NUMERIC)) + 
            CASE 
                WHEN MOD(CAST(ip AS NUMERIC), 1) = 0.1 THEN 1.0/3 
                WHEN MOD(CAST(ip AS NUMERIC), 1) = 0.2 THEN 2.0/3 
                ELSE 0 
            END AS ip_decimal 
        FROM intermediate.mv_athlete_stat_wide
    )
    SELECT 
        m.id AS main_tp_page_id,
        m.athlete_id,
        m.school_id,
        CAST(m.ncaa_id AS NUMERIC) AS ncaa_id,
        m.initiated_date,
        m.last_updated,
        m.knack_id AS m_knack_id,
        m.first_name AS m_first_name,
        m.last_name AS m_last_name,
        m.year AS m_year,
        m.division AS m_division,
        m.sport AS m_sport,
        m.conference AS m_conference,
        m.status AS m_status,
        m.link AS m_link,
        m.created_at AS m_created_at,
        m.designated_student_athlete AS m_designated_student_athlete,
        a.sport_id,
        a.first_name AS athlete_first_name,
        a.last_name AS athlete_last_name,
        a.knack_id AS athlete_knack_id,
        a.created_at AS athlete_created_at,
        d.id AS details_id,
        d.ok_to_contact,
        d.is_transfer_graduate_student,
        d.is_recruited,
        d.commit AS details_commit,
        d.db_update,
        d.expected_grad_date,
        d.is_four_year_transfer,
        d.athlete_survey_sent,
        d.is_aid_cancelled,
        d.comments,
        d.link AS details_link,
        d.email,
        {afw_block},
        {asw_block},
        ahb.best_honor,
        CASE 
            WHEN lower(afw.athletic_projection) IN ('fbs p4 - top half','fbs p4 - top-half') THEN 1 
            WHEN lower(afw.athletic_projection) = 'fbs p4' THEN 2 
            WHEN lower(afw.athletic_projection) IN ('fbs g5 - top half','fbs g5 - top-half') THEN 3 
            WHEN lower(afw.athletic_projection) = 'fbs g5' THEN 4 
            WHEN lower(afw.athletic_projection) = 'fcs - full scholarship' THEN 5 
            WHEN lower(afw.athletic_projection) = 'fcs' THEN 6 
            WHEN lower(afw.athletic_projection) IN ('d2 - top half','d2 - top-half') THEN 7 
            WHEN lower(afw.athletic_projection) = 'd2' THEN 8 
            WHEN lower(afw.athletic_projection) IN ('d3 - top half','d3 - top-half') THEN 9 
            WHEN lower(afw.athletic_projection) = 'd3' THEN 10 
            WHEN lower(afw.athletic_projection) = 'd3 walk-on' THEN 11 
            ELSE NULL 
        END::int AS athletic_projection_number,
        scw.school_type,
        scw.athletic_association,
        scw.division,
        scw.sub_division,
        scw.fbs_conf_group,
        scw.conference,
        scw.bsb_conference,
        scw.sb_conference,
        scw.wbb_conference,
        scw.mbb_conference,
        scw.msoc_conference,
        scw.wsoc_conference,
        scw.wvol_conference,
        scw.mlax_conference,
        scw.wlax_conference,
        scw.mten_conference,
        scw.wten_conference,
        scw.mglf_conference,
        scw.wglf_conference,
        scw.mtaf_conference,
        scw.wtaf_conference,
        scw.mswm_conference,
        scw.wswm_conference,
        scw.mwre_conference,
        scw.school_name,
        scw.juco_region,
        scw.juco_division,
        scw.school_state,
        scw.hs_county,
        scw.address_latitude,
        scw.address_longitude,
        com.school_id AS commit_school_id,
        com.commit_school_name AS commit_school_name,
        com.created_at AS commit_date,
        sig.school_id AS sign_school_id,
        sig.sign_school_name AS sign_school_name,
        COALESCE(afw.is_receiving_athletic_aid, 
                 CASE WHEN d.is_receiving_athletic_aid = TRUE THEN 'Yes' 
                      WHEN d.is_receiving_athletic_aid = FALSE THEN 'None' 
                      ELSE NULL END) AS is_receiving_athletic_aid
    FROM main_tp_page m
    JOIN athlete a ON m.athlete_id = a.id
    LEFT JOIN details_tp_page d ON d.main_tp_page_id = m.id
    LEFT JOIN intermediate.mv_athlete_fact_wide afw ON afw.athlete_id = m.athlete_id
    LEFT JOIN intermediate.mv_athlete_stat_wide asw ON asw.athlete_id = m.athlete_id
    LEFT JOIN intermediate.mv_athlete_honor_best ahb ON ahb.athlete_id = m.athlete_id
    LEFT JOIN intermediate.mv_athlete_commit com ON com.athlete_id = m.athlete_id
    LEFT JOIN intermediate.mv_athlete_sign sig ON sig.athlete_id = m.athlete_id
    LEFT JOIN intermediate.mv_school_fact_wide scw ON scw.school_id = m.school_id
    LEFT JOIN converted c ON c.athlete_id = asw.athlete_id
    WITH DATA;
    """

    mv_college_athletes_wide_drop = "DROP MATERIALIZED VIEW IF EXISTS intermediate.mv_college_athletes_wide CASCADE;"
    mv_college_athletes_wide_create = f"""
    CREATE MATERIALIZED VIEW intermediate.mv_college_athletes_wide AS
    WITH converted AS (
        SELECT *, 
            FLOOR(CAST(ip AS NUMERIC)) + 
            CASE 
                WHEN MOD(CAST(ip AS NUMERIC), 1) = 0.1 THEN 1.0/3 
                WHEN MOD(CAST(ip AS NUMERIC), 1) = 0.2 THEN 2.0/3 
                ELSE 0 
            END AS ip_decimal 
        FROM intermediate.mv_athlete_stat_wide
    )
    SELECT 
        m.id AS main_tp_page_id,
        a.id AS athlete_id,
        COALESCE(m.school_id, aths.school_id) AS school_id,
        a.sport_id,
        m.initiated_date,
        m.last_updated,
        m.knack_id AS m_knack_id,
        m.first_name AS m_first_name,
        m.last_name AS m_last_name,
        m.year AS m_year,
        m.division AS m_division,
        m.sport AS m_sport,
        m.conference AS m_conference,
        m.status AS m_status,
        m.link AS m_link,
        m.created_at AS m_created_at,
        m.designated_student_athlete AS m_designated_student_athlete,
        a.first_name AS athlete_first_name,
        a.last_name AS athlete_last_name,
        a.knack_id AS athlete_knack_id,
        a.created_at AS athlete_created_at,
        d.id AS details_id,
        d.ok_to_contact,
        d.is_transfer_graduate_student,
        d.is_recruited,
        d.commit AS details_commit,
        d.db_update,
        d.expected_grad_date,
        d.is_four_year_transfer,
        d.athlete_survey_sent,
        d.is_aid_cancelled,
        d.comments,
        d.link AS details_link,
        d.email,
        {afw_block},
        {asw_block},
        ahb.best_honor,
        CASE 
            WHEN lower(afw.athletic_projection) IN ('fbs p4 - top half','fbs p4 - top-half') THEN 1 
            WHEN lower(afw.athletic_projection) = 'fbs p4' THEN 2 
            WHEN lower(afw.athletic_projection) IN ('fbs g5 - top half','fbs g5 - top-half') THEN 3 
            WHEN lower(afw.athletic_projection) = 'fbs g5' THEN 4 
            WHEN lower(afw.athletic_projection) = 'fcs - full scholarship' THEN 5 
            WHEN lower(afw.athletic_projection) = 'fcs' THEN 6 
            WHEN lower(afw.athletic_projection) IN ('d2 - top half','d2 - top-half') THEN 7 
            WHEN lower(afw.athletic_projection) = 'd2' THEN 8 
            WHEN lower(afw.athletic_projection) IN ('d3 - top half','d3 - top-half') THEN 9 
            WHEN lower(afw.athletic_projection) = 'd3' THEN 10 
            WHEN lower(afw.athletic_projection) = 'd3 walk-on' THEN 11 
            ELSE NULL 
        END::int AS athletic_projection_number,
        scw.school_type,
        scw.athletic_association,
        scw.division,
        scw.sub_division,
        scw.fbs_conf_group,
        scw.conference,
        scw.bsb_conference,
        scw.sb_conference,
        scw.wbb_conference,
        scw.mbb_conference,
        scw.msoc_conference,
        scw.wsoc_conference,
        scw.wvol_conference,
        scw.mlax_conference,
        scw.wlax_conference,
        scw.mten_conference,
        scw.wten_conference,
        scw.mglf_conference,
        scw.wglf_conference,
        scw.mtaf_conference,
        scw.wtaf_conference,
        scw.mswm_conference,
        scw.wswm_conference,
        scw.mwre_conference,
        scw.school_name,
        scw.juco_region,
        scw.juco_division,
        scw.school_state,
        scw.hs_county,
        scw.address_latitude,
        scw.address_longitude,
        com.school_id AS commit_school_id,
        com.commit_school_name AS commit_school_name,
        com.created_at AS commit_date,
        sig.school_id AS sign_school_id,
        sig.sign_school_name AS sign_school_name,
        COALESCE(afw.is_receiving_athletic_aid, 
                 CASE WHEN d.is_receiving_athletic_aid = TRUE THEN 'Yes' 
                      WHEN d.is_receiving_athletic_aid = FALSE THEN 'None' 
                      ELSE NULL END) AS is_receiving_athletic_aid
    FROM athlete a
    LEFT JOIN LATERAL (
        SELECT * FROM main_tp_page m 
        WHERE m.athlete_id = a.id 
        ORDER BY m.initiated_date DESC NULLS LAST, m.id DESC 
        LIMIT 1
    ) m ON true
    LEFT JOIN details_tp_page d ON d.main_tp_page_id = m.id
    LEFT JOIN athlete_school aths ON aths.athlete_id = a.id AND aths.end_date IS NULL
    LEFT JOIN intermediate.mv_athlete_fact_wide afw ON afw.athlete_id = a.id
    LEFT JOIN intermediate.mv_athlete_stat_wide asw ON asw.athlete_id = a.id
    LEFT JOIN intermediate.mv_athlete_honor_best ahb ON ahb.athlete_id = a.id
    LEFT JOIN intermediate.mv_athlete_commit com ON com.athlete_id = a.id
    LEFT JOIN intermediate.mv_athlete_sign sig ON sig.athlete_id = a.id
    LEFT JOIN intermediate.mv_school_fact_wide scw ON scw.school_id = COALESCE(m.school_id, aths.school_id)
    LEFT JOIN converted c ON c.athlete_id = asw.athlete_id
    WHERE scw.school_type IN ('University/College','Dropped')
    WITH DATA;
    """

    mv_hs_athletes_wide_drop = "DROP MATERIALIZED VIEW IF EXISTS intermediate.mv_hs_athletes_wide CASCADE;"
    mv_hs_athletes_wide_create = f"""
    CREATE MATERIALIZED VIEW intermediate.mv_hs_athletes_wide AS
    WITH converted AS (
        SELECT *, 
            FLOOR(CAST(ip AS NUMERIC)) + 
            CASE 
                WHEN MOD(CAST(ip AS NUMERIC), 1) = 0.1 THEN 1.0/3 
                WHEN MOD(CAST(ip AS NUMERIC), 1) = 0.2 THEN 2.0/3 
                ELSE 0 
            END AS ip_decimal 
        FROM intermediate.mv_athlete_stat_wide
    )
    SELECT 
        m.id AS main_tp_page_id,
        a.id AS athlete_id,
        COALESCE(m.school_id, aths.school_id) AS school_id,
        a.sport_id,
        m.initiated_date,
        m.last_updated,
        m.knack_id AS m_knack_id,
        m.first_name AS m_first_name,
        m.last_name AS m_last_name,
        m.year AS m_year,
        m.division AS m_division,
        m.sport AS m_sport,
        m.conference AS m_conference,
        m.status AS m_status,
        m.link AS m_link,
        m.created_at AS m_created_at,
        m.designated_student_athlete AS m_designated_student_athlete,
        a.first_name AS athlete_first_name,
        a.last_name AS athlete_last_name,
        a.knack_id AS athlete_knack_id,
        a.created_at AS athlete_created_at,
        d.id AS details_id,
        d.ok_to_contact,
        d.is_transfer_graduate_student,
        d.is_recruited,
        d.commit AS details_commit,
        d.db_update,
        d.expected_grad_date,
        d.is_four_year_transfer,
        d.athlete_survey_sent,
        d.is_aid_cancelled,
        d.comments,
        d.link AS details_link,
        d.email,
        {afw_block},
        {asw_block},
        ahb.best_honor,
        CASE 
            WHEN lower(afw.athletic_projection) IN ('fbs p4 - top half','fbs p4 - top-half') THEN 1 
            WHEN lower(afw.athletic_projection) = 'fbs p4' THEN 2 
            WHEN lower(afw.athletic_projection) IN ('fbs g5 - top half','fbs g5 - top-half') THEN 3 
            WHEN lower(afw.athletic_projection) = 'fbs g5' THEN 4 
            WHEN lower(afw.athletic_projection) = 'fcs - full scholarship' THEN 5 
            WHEN lower(afw.athletic_projection) = 'fcs' THEN 6 
            WHEN lower(afw.athletic_projection) IN ('d2 - top half','d2 - top-half') THEN 7 
            WHEN lower(afw.athletic_projection) = 'd2' THEN 8 
            WHEN lower(afw.athletic_projection) IN ('d3 - top half','d3 - top-half') THEN 9 
            WHEN lower(afw.athletic_projection) = 'd3' THEN 10 
            WHEN lower(afw.athletic_projection) = 'd3 walk-on' THEN 11 
            ELSE NULL 
        END::int AS athletic_projection_number,
        scw.school_type,
        scw.athletic_association,
        scw.division,
        scw.sub_division,
        scw.fbs_conf_group,
        scw.conference,
        scw.bsb_conference,
        scw.sb_conference,
        scw.wbb_conference,
        scw.mbb_conference,
        scw.msoc_conference,
        scw.wsoc_conference,
        scw.wvol_conference,
        scw.mlax_conference,
        scw.wlax_conference,
        scw.mten_conference,
        scw.wten_conference,
        scw.mglf_conference,
        scw.wglf_conference,
        scw.mtaf_conference,
        scw.wtaf_conference,
        scw.mswm_conference,
        scw.wswm_conference,
        scw.mwre_conference,
        scw.school_name,
        scw.juco_region,
        scw.juco_division,
        scw.school_state,
        scw.hs_county,
        scw.address_latitude,
        scw.address_longitude,
        com.school_id AS commit_school_id,
        com.commit_school_name AS commit_school_name,
        com.created_at AS commit_date,
        sig.school_id AS sign_school_id,
        sig.sign_school_name AS sign_school_name,
        COALESCE(afw.is_receiving_athletic_aid, 
                 CASE WHEN d.is_receiving_athletic_aid = TRUE THEN 'Yes' 
                      WHEN d.is_receiving_athletic_aid = FALSE THEN 'None' 
                      ELSE NULL END) AS is_receiving_athletic_aid
    FROM athlete a
    LEFT JOIN LATERAL (
        SELECT * FROM main_tp_page m 
        WHERE m.athlete_id = a.id 
        ORDER BY m.initiated_date DESC NULLS LAST, m.id DESC 
        LIMIT 1
    ) m ON true
    LEFT JOIN details_tp_page d ON d.main_tp_page_id = m.id
    LEFT JOIN athlete_school aths ON aths.athlete_id = a.id AND aths.end_date IS NULL
    LEFT JOIN intermediate.mv_athlete_fact_wide afw ON afw.athlete_id = a.id
    LEFT JOIN intermediate.mv_athlete_stat_wide asw ON asw.athlete_id = a.id
    LEFT JOIN intermediate.mv_athlete_honor_best ahb ON ahb.athlete_id = a.id
    LEFT JOIN intermediate.mv_athlete_commit com ON com.athlete_id = a.id
    LEFT JOIN intermediate.mv_athlete_sign sig ON sig.athlete_id = a.id
    LEFT JOIN intermediate.mv_school_fact_wide scw ON scw.school_id = COALESCE(m.school_id, aths.school_id)
    LEFT JOIN converted c ON c.athlete_id = asw.athlete_id
    WHERE scw.school_type ILIKE 'high school'
    WITH DATA;
    """

    mv_juco_athletes_wide_drop = "DROP MATERIALIZED VIEW IF EXISTS intermediate.mv_juco_athletes_wide CASCADE;"
    mv_juco_athletes_wide_create = f"""
    CREATE MATERIALIZED VIEW intermediate.mv_juco_athletes_wide AS
    WITH converted AS (
        SELECT *, 
            FLOOR(CAST(ip AS NUMERIC)) + 
            CASE 
                WHEN MOD(CAST(ip AS NUMERIC), 1) = 0.1 THEN 1.0/3 
                WHEN MOD(CAST(ip AS NUMERIC), 1) = 0.2 THEN 2.0/3 
                ELSE 0 
            END AS ip_decimal 
        FROM intermediate.mv_athlete_stat_wide
    )
    SELECT 
        m.id AS main_tp_page_id,
        a.id AS athlete_id,
        COALESCE(m.school_id, aths.school_id) AS school_id,
        a.sport_id,
        m.initiated_date,
        m.last_updated,
        m.knack_id AS m_knack_id,
        m.first_name AS m_first_name,
        m.last_name AS m_last_name,
        m.year AS m_year,
        m.division AS m_division,
        m.sport AS m_sport,
        m.conference AS m_conference,
        m.status AS m_status,
        m.link AS m_link,
        m.created_at AS m_created_at,
        m.designated_student_athlete AS m_designated_student_athlete,
        a.first_name AS athlete_first_name,
        a.last_name AS athlete_last_name,
        a.knack_id AS athlete_knack_id,
        a.created_at AS athlete_created_at,
        d.id AS details_id,
        d.ok_to_contact,
        d.is_transfer_graduate_student,
        d.is_recruited,
        d.commit AS details_commit,
        d.db_update,
        d.expected_grad_date,
        d.is_four_year_transfer,
        d.athlete_survey_sent,
        d.is_aid_cancelled,
        d.comments,
        d.link AS details_link,
        d.email,
        {afw_block},
        {asw_block},
        ahb.best_honor,
        CASE 
            WHEN lower(afw.athletic_projection) IN ('fbs p4 - top half','fbs p4 - top-half') THEN 1 
            WHEN lower(afw.athletic_projection) = 'fbs p4' THEN 2 
            WHEN lower(afw.athletic_projection) IN ('fbs g5 - top half','fbs g5 - top-half') THEN 3 
            WHEN lower(afw.athletic_projection) = 'fbs g5' THEN 4 
            WHEN lower(afw.athletic_projection) = 'fcs - full scholarship' THEN 5 
            WHEN lower(afw.athletic_projection) = 'fcs' THEN 6 
            WHEN lower(afw.athletic_projection) IN ('d2 - top half','d2 - top-half') THEN 7 
            WHEN lower(afw.athletic_projection) = 'd2' THEN 8 
            WHEN lower(afw.athletic_projection) IN ('d3 - top half','d3 - top-half') THEN 9 
            WHEN lower(afw.athletic_projection) = 'd3' THEN 10 
            WHEN lower(afw.athletic_projection) = 'd3 walk-on' THEN 11 
            ELSE NULL 
        END::int AS athletic_projection_number,
        scw.school_type,
        scw.athletic_association,
        scw.division,
        scw.sub_division,
        scw.fbs_conf_group,
        scw.conference,
        scw.bsb_conference,
        scw.sb_conference,
        scw.wbb_conference,
        scw.mbb_conference,
        scw.msoc_conference,
        scw.wsoc_conference,
        scw.wvol_conference,
        scw.mlax_conference,
        scw.wlax_conference,
        scw.mten_conference,
        scw.wten_conference,
        scw.mglf_conference,
        scw.wglf_conference,
        scw.mtaf_conference,
        scw.wtaf_conference,
        scw.mswm_conference,
        scw.wswm_conference,
        scw.mwre_conference,
        scw.school_name,
        scw.juco_region,
        scw.juco_division,
        scw.school_state,
        scw.hs_county,
        scw.address_latitude,
        scw.address_longitude,
        com.school_id AS commit_school_id,
        com.commit_school_name AS commit_school_name,
        com.created_at AS commit_date,
        sig.school_id AS sign_school_id,
        sig.sign_school_name AS sign_school_name,
        COALESCE(afw.is_receiving_athletic_aid, 
                 CASE WHEN d.is_receiving_athletic_aid = TRUE THEN 'Yes' 
                      WHEN d.is_receiving_athletic_aid = FALSE THEN 'None' 
                      ELSE NULL END) AS is_receiving_athletic_aid
    FROM athlete a
    LEFT JOIN LATERAL (
        SELECT * FROM main_tp_page m 
        WHERE m.athlete_id = a.id 
        ORDER BY m.initiated_date DESC NULLS LAST, m.id DESC 
        LIMIT 1
    ) m ON true
    LEFT JOIN details_tp_page d ON d.main_tp_page_id = m.id
    LEFT JOIN athlete_school aths ON aths.athlete_id = a.id AND aths.end_date IS NULL
    LEFT JOIN intermediate.mv_athlete_fact_wide afw ON afw.athlete_id = a.id
    LEFT JOIN intermediate.mv_athlete_stat_wide asw ON asw.athlete_id = a.id
    LEFT JOIN intermediate.mv_athlete_honor_best ahb ON ahb.athlete_id = a.id
    LEFT JOIN intermediate.mv_athlete_commit com ON com.athlete_id = a.id
    LEFT JOIN intermediate.mv_athlete_sign sig ON sig.athlete_id = a.id
    LEFT JOIN intermediate.mv_school_fact_wide scw ON scw.school_id = COALESCE(m.school_id, aths.school_id)
    LEFT JOIN converted c ON c.athlete_id = asw.athlete_id
    WHERE scw.school_type ILIKE 'junior college'
    WITH DATA;
    """

    mv_activity_feed_drop = "DROP MATERIALIZED VIEW IF EXISTS intermediate.mv_activity_feed CASCADE;"
    mv_activity_feed_create = """
    CREATE MATERIALIZED VIEW intermediate.mv_activity_feed AS
    SELECT 
        o.id AS offer_id,
        o.created_at AS offer_created_at,
        o.source,
        o.type,
        o.coach_ask_to_remove,
        o.ended_at,
        o.walk_on,
        o.offer_date,
        a.sport_id,
        a.first_name,
        a.last_name,
        a.school_name as ath_school,
        a.school_id as ath_school_id,
        -- === Athlete's current school (2nd SFW join, prefixed ath_school_*) ===
        sfw_ath.address_city AS ath_school_address_city,
        sfw_ath.school_state AS ath_school_school_state,
        sfw_ath.county_id AS ath_school_county_id,
        sfw_ath.address_latitude AS ath_school_address_latitude,
        sfw_ath.address_longitude AS ath_school_address_longitude,
        sfw_ath.school_type AS ath_school__school_type,
        afw.athlete_id AS afw_athlete_id,
        afw.year AS afw_year,
        afw.primary_position AS afw_primary_position,
        CASE WHEN afw.height_feet ~ '^-?\\d+(\\.\\d+)?$' THEN afw.height_feet::NUMERIC END AS afw_height_feet,
        CASE WHEN afw.height_inch ~ '^-?\\d+(\\.\\d+)?$' THEN afw.height_inch::NUMERIC END AS afw_height_inch,
        CASE WHEN afw.weight ~ '^-?\\d+(\\.\\d+)?$' THEN afw.weight::NUMERIC END AS afw_weight,
        afw.high_school AS afw_high_school,
        afw.previous_schools AS afw_previous_schools,
        afw.major AS afw_major,
        afw.twitter AS afw_twitter,
        afw.club AS afw_club,
        afw.hand AS afw_hand,
        afw.image_url AS afw_image_url,
        afw.address_state AS afw_address_state,
        afw.elig_remaining AS afw_elig_remaining,
        CASE WHEN afw.gpa ~ '^-?\\d+(\\.\\d+)?$' THEN afw.gpa::NUMERIC END AS afw_gpa,
        afw.highlight AS afw_highlight,
        afw.summer_league AS afw_summer_league,
        afw.survey_completed AS afw_survey_completed,
        afw.is_receiving_athletic_aid AS afw_is_receiving_athletic_aid,
        afw.faith_based_school AS afw_faith_based_school,
        afw.track_wrestling_profile AS afw_track_wrestling_profile,
        afw.wrestle_stat_link AS afw_wrestle_stat_link,
        afw.stats_url AS afw_stats_url,
        CASE WHEN afw.roster_year ~ '^-?\\d+(\\.\\d+)?$' THEN afw.roster_year::NUMERIC END AS afw_roster_year,
        afw.utr_link AS afw_utr_link,
        afw.long_jump AS afw_long_jump,
        afw.college_career_score AS afw_college_career_score,
        afw.hs_career_score AS afw_hs_career_score,
        afw.football_career_score AS afw_football_career_score,
        afw.predicted_transfer_destination AS afw_predicted_transfer_destination,
        CASE WHEN afw.transfer_odds ~ '^-?\\d+(\\.\\d+)?$' THEN afw.transfer_odds::NUMERIC END AS afw_transfer_odds,
        afw.up_predictions AS afw_up_predictions,
        afw.down_predictions AS afw_down_predictions,
        afw.flat_predictions AS afw_flat_predictions,
        afw.risk_category AS afw_risk_category,
        afw.pred_direction AS afw_pred_direction,
        afw.rivals_rating AS afw_rivals_rating,
        afw.shot_put AS afw_shot_put,
        afw.forty AS afw_forty,
        afw.shuttle AS afw_shuttle,
        afw.three_cone AS afw_three_cone,
        afw.broad_jump AS afw_broad_jump,
        afw.vert_jump AS afw_vert_jump,
        afw.roster_link AS afw_roster_link,
        afw.athletic_projection AS afw_athletic_projection,
        CASE WHEN afw.grad_year ~ '^-?\\d+(\\.\\d+)?$' THEN afw.grad_year::NUMERIC END AS afw_grad_year,
        afw.hs_highlight AS afw_hs_highlight,
        CASE WHEN afw.sat ~ '^-?\\d+(\\.\\d+)?$' THEN afw.sat::NUMERIC END AS afw_sat,
        CASE WHEN afw.act ~ '^-?\\d+(\\.\\d+)?$' THEN afw.act::NUMERIC END AS afw_act,
        afw.gpa_type AS afw_gpa_type,
        afw.hs_coach_hide AS afw_hs_coach_hide,
        afw.best_offer AS afw_best_offer,
        afw.income AS afw_income,
        afw.added_date AS afw_added_date,
        afw.last_major_change AS afw_last_major_change,
        afw.on3_consensus_rating AS afw_on3_consensus_rating,
        afw.on3_rating AS afw_on3_rating,
        afw._247_rating AS afw__247_rating,
        afw.espn_rating AS afw_espn_rating,
        afw.on3_consensus_stars AS afw_on3_consensus_stars,
        afw.on3_stars AS afw_on3_stars,
        afw._247_stars AS afw__247_stars,
        afw.espn_stars AS afw_espn_stars,
        afw.income_category AS afw_income_category,
        sfw.school_id AS sfw_school_id,
        sfw.school_name AS sfw_school_name,
        sfw.msoc_conference AS sfw_msoc_conference,
        sfw.school_type AS sfw_school_type,
        sfw.athletic_association AS sfw_athletic_association,
        sfw.division AS sfw_division,
        sfw.sub_division AS sfw_sub_division,
        sfw.bsb_conference AS sfw_bsb_conference,
        sfw.fbs_conf_group AS sfw_fbs_conf_group,
        sfw.school_state AS sfw_school_state,
        sfw.academic_ranking AS sfw_academic_ranking,
        sfw.conference AS sfw_conference,
        sfw.wbb_conference AS sfw_wbb_conference,
        sfw.mbb_conference AS sfw_mbb_conference,
        sfw.wvol_conference AS sfw_wvol_conference,
        sfw.sb_conference AS sfw_sb_conference,
        sfw.mlax_conference AS sfw_mlax_conference,
        sfw.wlax_conference AS sfw_wlax_conference,
        sfw.mten_conference AS sfw_mten_conference,
        sfw.wten_conference AS sfw_wten_conference,
        sfw.mglf_conference AS sfw_mglf_conference,
        sfw.wglf_conference AS sfw_wglf_conference,
        sfw.mtaf_conference AS sfw_mtaf_conference,
        sfw.wtaf_conference AS sfw_wtaf_conference,
        sfw.mswm_conference AS sfw_mswm_conference,
        sfw.wswm_conference AS sfw_wswm_conference,
        sfw.mwre_conference AS sfw_mwre_conference,
        sfw.wsoc_conference AS sfw_wsoc_conference,
        sfw.juco_region AS sfw_juco_region,
        sfw.juco_division AS sfw_juco_division,
        sfw.juco_has_football AS sfw_juco_has_football,
        sfw.address_state AS sfw_address_state,
        sfw.academics AS sfw_academics,
        sfw.address_latitude AS sfw_address_latitude,
        sfw.address_longitude AS sfw_address_longitude,
        sfw.college_player_producing AS sfw_college_player_producing,
        sfw.d1_player_producing AS sfw_d1_player_producing,
        sfw.team_quality AS sfw_team_quality,
        sfw.athlete_income AS sfw_athlete_income,
        sfw.county_id AS sfw_county_id,
        sfw.affiliation AS sfw_affiliation,
        sfw.private_public AS sfw_private_public,
        sfw.hs_state AS sfw_hs_state,
        sfw.hc_name AS sfw_hc_name,
        sfw.hc_email AS sfw_hc_email,
        sfw.hc_number AS sfw_hc_number,
        sfw.hs_county AS sfw_hs_county,
        agg.counts_by_group AS offer_counts_by_group
    FROM offer o
    LEFT JOIN intermediate.mv_athlete_fact_wide afw ON afw.athlete_id = o.athlete_id
    LEFT JOIN intermediate.mv_school_fact_wide sfw ON sfw.school_id = o.school_id
    LEFT JOIN athlete_with_school a ON a.id = o.athlete_id
    LEFT JOIN intermediate.mv_school_fact_wide sfw_ath ON sfw_ath.school_id = a.school_id
    LEFT JOIN LATERAL (
        SELECT COALESCE(
            jsonb_object_agg(category, cnt ORDER BY category),
            '{}'::jsonb
        ) AS counts_by_group
        FROM (
            SELECT sf.value AS category, COUNT(*) AS cnt
            FROM offer o2
            JOIN school_fact sf ON sf.school_id = o2.school_id AND sf.data_type_id = 252
            WHERE o2.type = 'offer' AND o2.athlete_id = o.athlete_id
            GROUP BY sf.value
        ) t
    ) agg ON TRUE
    WHERE o.coach_ask_to_remove IS NULL
    WITH DATA;
    """

    # Execute all DROP and CREATE statements with detailed labels
    # Order matters: dependencies must be created after their dependencies
    mv_operations = [
        ("latest_athlete_facts", latest_athlete_facts_drop, latest_athlete_facts_create),
        ("mv_school_fact_wide", school_fact_wide_drop, school_fact_wide_create),  # Must come before athlete_stat_wide
        ("mv_athlete_fact_wide", athlete_fact_wide_drop, athlete_fact_wide_create),
        ("mv_athlete_stat_wide", athlete_stat_wide_drop, athlete_stat_wide_create),  # Depends on mv_school_fact_wide
        ("mv_athlete_honor_best", athlete_honor_best_drop, athlete_honor_best_create),
        ("mv_athlete_commit", athlete_commit_drop, athlete_commit_create),
        ("mv_athlete_sign", athlete_sign_drop, athlete_sign_create),
        ("mv_tp_athletes_wide", mv_tp_athletes_wide_drop, mv_tp_athletes_wide_create),
        ("mv_college_athletes_wide", mv_college_athletes_wide_drop, mv_college_athletes_wide_create),
        ("mv_hs_athletes_wide", mv_hs_athletes_wide_drop, mv_hs_athletes_wide_create),
        ("mv_juco_athletes_wide", mv_juco_athletes_wide_drop, mv_juco_athletes_wide_create),
        ("mv_activity_feed", mv_activity_feed_drop, mv_activity_feed_create)
    ]

    for i, (mv_name, drop_stmt, create_stmt) in enumerate(mv_operations, 1):
        # DROP operation
        safe_print(f"[DROP MVs] {i}/{len(mv_operations)} - Dropping {mv_name}...")
        run_sql(drop_stmt)

        # CREATE operation
        safe_print(f"[CREATE MVs] {i}/{len(mv_operations)} - Creating {mv_name}...")
        run_sql(create_stmt)

        # CREATE indexes immediately after each MV
        create_indexes_for_mv(mv_name)


def create_indexes_for_mv(mv_name: str):
    """Create indexes for a specific materialized view."""
    # Index mapping for each MV
    mv_indexes = {
        "latest_athlete_facts": [
            "CREATE UNIQUE INDEX IF NOT EXISTS latest_athlete_facts_uq ON intermediate.latest_athlete_facts (athlete_id, data_type_id);",
            "CREATE INDEX IF NOT EXISTS latest_athlete_facts_athlete_id ON intermediate.latest_athlete_facts (athlete_id);",
            "CREATE INDEX IF NOT EXISTS latest_athlete_facts_data_type_id ON intermediate.latest_athlete_facts (data_type_id);"
        ],
        "mv_school_fact_wide": [
            "CREATE UNIQUE INDEX IF NOT EXISTS mv_school_fact_wide_uq ON intermediate.mv_school_fact_wide (school_id);",
            "CREATE INDEX IF NOT EXISTS mv_school_fact_wide_school_type ON intermediate.mv_school_fact_wide (school_type);",
            "CREATE INDEX IF NOT EXISTS mv_school_fact_wide_division ON intermediate.mv_school_fact_wide (division);",
            "CREATE INDEX IF NOT EXISTS mv_school_fact_wide_conference ON intermediate.mv_school_fact_wide (conference);"
        ],
        "mv_athlete_fact_wide": [
            "CREATE UNIQUE INDEX IF NOT EXISTS mv_athlete_fact_wide_uq ON intermediate.mv_athlete_fact_wide (athlete_id);",
            "CREATE INDEX IF NOT EXISTS mv_athlete_fact_wide_year ON intermediate.mv_athlete_fact_wide (year);",
            "CREATE INDEX IF NOT EXISTS mv_athlete_fact_wide_primary_position ON intermediate.mv_athlete_fact_wide (primary_position);",
            "CREATE INDEX IF NOT EXISTS mv_athlete_fact_wide_high_school ON intermediate.mv_athlete_fact_wide (high_school);",
            "CREATE INDEX IF NOT EXISTS mv_athlete_fact_wide_survey_completed ON intermediate.mv_athlete_fact_wide (survey_completed);"
        ],
        "mv_athlete_stat_wide": [
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_athlete_stat_wide__athlete_id ON intermediate.mv_athlete_stat_wide (athlete_id);",
            "CREATE INDEX IF NOT EXISTS mv_athlete_stat_wide_gp ON intermediate.mv_athlete_stat_wide (gp);",
            "CREATE INDEX IF NOT EXISTS mv_athlete_stat_wide_gs ON intermediate.mv_athlete_stat_wide (gs);"
        ],
        "mv_athlete_honor_best": [
            "CREATE UNIQUE INDEX IF NOT EXISTS mv_athlete_honor_best_uq ON intermediate.mv_athlete_honor_best (athlete_id);",
            "CREATE INDEX IF NOT EXISTS mv_athlete_honor_best_award ON intermediate.mv_athlete_honor_best (best_honor);"
        ],
        "mv_athlete_commit": [
            "CREATE UNIQUE INDEX IF NOT EXISTS mv_athlete_commit_uq ON intermediate.mv_athlete_commit (athlete_id);",
            "CREATE INDEX IF NOT EXISTS mv_athlete_commit_school_id ON intermediate.mv_athlete_commit (school_id);",
            "CREATE INDEX IF NOT EXISTS mv_athlete_commit_created_at ON intermediate.mv_athlete_commit (created_at);"
        ],
        "mv_athlete_sign": [
            "CREATE UNIQUE INDEX IF NOT EXISTS mv_athlete_sign_uq ON intermediate.mv_athlete_sign (athlete_id);",
            "CREATE INDEX IF NOT EXISTS mv_athlete_sign_school_id ON intermediate.mv_athlete_sign (school_id);",
            "CREATE INDEX IF NOT EXISTS mv_athlete_sign_created_at ON intermediate.mv_athlete_sign (created_at);"
        ],
        "mv_tp_athletes_wide": [
            "CREATE UNIQUE INDEX IF NOT EXISTS mv_tp_athletes_wide_uq ON intermediate.mv_tp_athletes_wide (main_tp_page_id);",
            "CREATE INDEX IF NOT EXISTS mv_tp_athletes_wide_sport_id ON intermediate.mv_tp_athletes_wide (sport_id);",
            "CREATE INDEX IF NOT EXISTS mv_tp_athletes_wide_school_id ON intermediate.mv_tp_athletes_wide (school_id);",
            "CREATE INDEX IF NOT EXISTS mv_tp_athletes_wide_initiated_date ON intermediate.mv_tp_athletes_wide (initiated_date DESC);"
        ],
        "mv_college_athletes_wide": [
            "CREATE UNIQUE INDEX IF NOT EXISTS mv_college_athletes_wide_uq ON intermediate.mv_college_athletes_wide (athlete_id);",
            "CREATE INDEX IF NOT EXISTS mv_college_athletes_wide_sport_id ON intermediate.mv_college_athletes_wide (sport_id);",
            "CREATE INDEX IF NOT EXISTS mv_college_athletes_wide_school_id ON intermediate.mv_college_athletes_wide (school_id);"
        ],
        "mv_hs_athletes_wide": [
            "CREATE UNIQUE INDEX IF NOT EXISTS mv_hs_athletes_wide_uq ON intermediate.mv_hs_athletes_wide (athlete_id);",
            "CREATE INDEX IF NOT EXISTS mv_hs_athletes_wide_sport_id ON intermediate.mv_hs_athletes_wide (sport_id);",
            "CREATE INDEX IF NOT EXISTS mv_hs_athletes_wide_school_id ON intermediate.mv_hs_athletes_wide (school_id);"
        ],
        "mv_juco_athletes_wide": [
            "CREATE UNIQUE INDEX IF NOT EXISTS mv_juco_athletes_wide_uq ON intermediate.mv_juco_athletes_wide (athlete_id);",
            "CREATE INDEX IF NOT EXISTS mv_juco_athletes_wide_sport_id ON intermediate.mv_juco_athletes_wide (sport_id);",
            "CREATE INDEX IF NOT EXISTS mv_juco_athletes_wide_school_id ON intermediate.mv_juco_athletes_wide (school_id);"
        ],
        "mv_activity_feed": [
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_activity_feed__offer_id ON intermediate.mv_activity_feed (offer_id);",
            "CREATE INDEX IF NOT EXISTS ix_mv_activity_feed__sport_id ON intermediate.mv_activity_feed (sport_id);",
            "CREATE INDEX IF NOT EXISTS ix_mv_activity_feed__afw_athletic_projection ON intermediate.mv_activity_feed (afw_athletic_projection);",
            "CREATE INDEX IF NOT EXISTS ix_mv_activity_feed__sfw_division ON intermediate.mv_activity_feed (sfw_division);",
            "CREATE INDEX IF NOT EXISTS ix_mv_activity_feed__sfw_conference ON intermediate.mv_activity_feed (sfw_conference);"
        ]
    }

    indexes = mv_indexes.get(mv_name, [])
    if not indexes:
        safe_print(f"[INDEXES] No indexes defined for {mv_name}")
        return

    for i, idx in enumerate(indexes, 1):
        safe_print(f"[INDEXES] {i}/{len(indexes)} - Creating index for {mv_name}...")
        run_sql(idx)


def create_indexes():
    """Create indexes on materialized views."""
    indexes = [
        ("latest_athlete_facts", "CREATE UNIQUE INDEX IF NOT EXISTS latest_athlete_facts_uq ON intermediate.latest_athlete_facts (athlete_id, data_type_id);"),
        ("mv_athlete_fact_wide", "CREATE UNIQUE INDEX IF NOT EXISTS mv_athlete_fact_wide_uq ON intermediate.mv_athlete_fact_wide (athlete_id);"),
        ("mv_athlete_stat_wide", "CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_athlete_stat_wide__athlete_id ON intermediate.mv_athlete_stat_wide (athlete_id);"),
        ("mv_school_fact_wide", "CREATE UNIQUE INDEX IF NOT EXISTS mv_school_fact_wide_uq ON intermediate.mv_school_fact_wide (school_id);"),
        ("mv_athlete_honor_best", "CREATE UNIQUE INDEX IF NOT EXISTS mv_athlete_honor_best_uq ON intermediate.mv_athlete_honor_best (athlete_id);"),
        ("mv_athlete_commit", "CREATE UNIQUE INDEX IF NOT EXISTS mv_athlete_commit_uq ON intermediate.mv_athlete_commit (athlete_id);"),
        ("mv_athlete_sign", "CREATE UNIQUE INDEX IF NOT EXISTS mv_athlete_sign_uq ON intermediate.mv_athlete_sign (athlete_id);")
    ]

    for i, (mv_name, idx) in enumerate(indexes, 1):
        safe_print(f"[CREATE INDEXES] {i}/{len(indexes)} - Creating index for {mv_name}...")
        run_sql(idx)
        safe_print(f"[CREATE INDEXES] ✓ Index for {mv_name} created successfully")


# Removed refresh function - no longer needed with WITH DATA approach

def build_view_statements(config):
    import re
    suffix = config["suffix"]
    sport_id = config["sport_id"]

    # Packages (some may be unused depending on suffix)
    starter_pkg = config.get("starter_package_id")
    elite_pkg = config.get("elite_package_id")
    ultra_pkg = config.get("ultra_package_id")
    naia_pkg = config.get("naia_package_id")
    naia_plus_pkg = config.get("naia_plus_package_id")
    juco_pkg = config.get("juco_package_id")
    platinum_pkg = config.get("platinum_package_id")
    gold_pkg = config.get("gold_package_id")
    old_gold_pkg = config.get("old_gold_package_id")
    silver_plus_pkg = config.get("silver_plus_package_id")
    silver_pkg = config.get("silver_package_id")

    # Use suffix instead of a separate flag
    is_football = (suffix == "fb")

    # Non-football full access (unchanged default)
    full_access_pkgs_default = config.get(
        "full_access_package_ids",
        [starter_pkg, elite_pkg, naia_pkg, naia_plus_pkg, ultra_pkg, platinum_pkg, gold_pkg, old_gold_pkg, silver_plus_pkg, silver_pkg]
    )

    # Football: only platinum + old_gold count as "full access"
    if is_football:
        full_access_pkgs_for_sport = [p for p in [platinum_pkg, old_gold_pkg] if p is not None]
        conf_field = "conference"
        naia_pkgs = [p for p in [naia_pkg, naia_plus_pkg] if p is not None]
        naia_pkgs_list = ", ".join(str(p) for p in naia_pkgs)
    else:
        full_access_pkgs_for_sport = [p for p in full_access_pkgs_default if p is not None]
        # For non-football sports, use {suffix}_conference
        conf_field = f"{suffix}_conference"
        naia_pkgs_list = naia_pkg if naia_pkg is not None else -1  # impossible package id

    redacted_cols = standard_redacted_columns + config["redacted_columns"]

    RESERVED_WORDS = {"to"}  # extend if needed

    def quote_if_needed(col):
        return f'"{col}"' if (not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', col) or col.lower() in RESERVED_WORDS) else col

    starter_select_lines = [
        f" CASE WHEN needs_redaction THEN NULL ELSE {quote_if_needed(col)} END AS {quote_if_needed(col)}"
        if col != conf_field else f" {quote_if_needed(col)}"
        for col in redacted_cols
    ]

    starter_select = ",\n".join([
        " main_tp_page_id",
        " athlete_id",
        " school_id",
        " initiated_date",
        " m_first_name",
        " m_last_name",
        " m_status",
        " m_created_at",
        " m_designated_student_athlete",
        " school_name",
        " division",
        f" {conf_field}",
        *starter_select_lines
    ])

    # Sports where GP requirement is NOT applied (your original set)
    gp_ignored_suffixes = {"mtaf", "wtaf", "wglf", "mglf", "wten", "mten", "wswm", "mswm", "mwre"}

    # Base redaction condition (used for non-football starter-like behavior)
    if suffix in gp_ignored_suffixes:
        base_redaction_condition = f"({conf_field} IN ('ACC', 'Big 12', 'Big 10', 'SEC'))"
    else:
        base_redaction_condition = f"({conf_field} IN ('ACC', 'Big 12', 'Big 10', 'SEC') AND gp::int > 0)"

    # Football GOLD redaction condition (gs > 6 instead of gp > 0)
    if is_football:
        if suffix in gp_ignored_suffixes:
            gold_redaction_condition = f"({conf_field} IN ('ACC', 'Big 12', 'Big 10', 'SEC'))"
        else:
            gold_redaction_condition = f"({conf_field} IN ('ACC', 'Big 12', 'Big 10', 'SEC') AND gs::int > 6)"

    full_access_pkgs_for_sport = sorted(set(full_access_pkgs_for_sport + EXTRA_FULL_ACCESS_PKGS))
    full_access_pkg_list = ", ".join(str(p) for p in full_access_pkgs_for_sport)

    views = {}

    # ===== TP FULL ACCESS VIEW =====
    views[f"vw_tp_athletes_wide_{suffix}"] = {
        "drop": "",  # ← do not drop public views
        "create": f"""CREATE OR REPLACE VIEW public.vw_tp_athletes_wide_{suffix} AS
SELECT t.* FROM intermediate.mv_tp_athletes_wide t  -- ← read from MV directly
WHERE t.sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id IN ({elite_pkg}, {ultra_pkg})
);""" if not is_football else f"""CREATE OR REPLACE VIEW public.vw_tp_athletes_wide_{suffix} AS
SELECT t.* FROM intermediate.mv_tp_athletes_wide t
WHERE t.sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id IN ({platinum_pkg}, {old_gold_pkg})
);"""
    }

    # ===== TP NAIA VIEW (same for all sports) =====
    views[f"vw_tp_athletes_wide_{suffix}_naia"] = {
        "drop": "",
        "create": f"""CREATE OR REPLACE VIEW public.vw_tp_athletes_wide_{suffix}_naia AS
SELECT t.* FROM intermediate.mv_tp_athletes_wide t
WHERE t.sport_id = {sport_id} AND t.survey_completed = 'true' AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id IN ({naia_pkgs_list})
);"""
    }

    # ===== TP STARTER-LIKE VIEW(S) =====
    if not is_football:
        # Original starter behavior for non-football
        if starter_pkg is not None:
            views[f"vw_tp_athletes_wide_{suffix}_starter"] = {
                "drop": "",
                "create": f"""CREATE OR REPLACE VIEW public.vw_tp_athletes_wide_{suffix}_starter AS
WITH base AS (
    SELECT *, {base_redaction_condition} AS needs_redaction
    FROM intermediate.mv_tp_athletes_wide  -- ← pointer
)
SELECT {starter_select}
FROM base
WHERE sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id = {starter_pkg}
);"""
            }
    else:
        # Football: SILVER/SILVER_PLUS -> "_silver" (same layout as starter; GP rule)
        if silver_pkg is not None or silver_plus_pkg is not None:
            pkg_list = ", ".join(str(p) for p in [p for p in [silver_pkg, silver_plus_pkg] if p is not None])
            views[f"vw_tp_athletes_wide_{suffix}_silver"] = {
                "drop": "",
                "create": f"""CREATE OR REPLACE VIEW public.vw_tp_athletes_wide_{suffix}_silver AS
WITH base AS (
    SELECT *, {base_redaction_condition} AS needs_redaction
    FROM intermediate.mv_tp_athletes_wide
)
SELECT {starter_select}
FROM base
WHERE sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id IN ({pkg_list})
);"""
            }

        # Football: GOLD -> "_gold" (uses GS > 6 rule)
        if gold_pkg is not None:
            views[f"vw_tp_athletes_wide_{suffix}_gold"] = {
                "drop": "",
                "create": f"""CREATE OR REPLACE VIEW public.vw_tp_athletes_wide_{suffix}_gold AS
WITH base AS (
    SELECT *, {gold_redaction_condition} AS needs_redaction
    FROM intermediate.mv_tp_athletes_wide
)
SELECT {starter_select}
FROM base
WHERE sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id = {gold_pkg}
);"""
            }

    # ===== NON-TP FULL ACCESS VIEW =====
    # Non-football: keep your full-access list (unchanged)
    # Football: only platinum + old_gold are full access for non-TP too
    if full_access_pkgs_for_sport:
        views[f"vw_athletes_wide_{suffix}"] = {
            "drop": "",
            "create": f"""CREATE OR REPLACE VIEW public.vw_athletes_wide_{suffix} AS
SELECT t.* FROM intermediate.mv_college_athletes_wide t  -- ← pointer
WHERE t.sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id IN ({full_access_pkg_list})
);"""
        }

    # ===== HIGH SCHOOL VIEWS =====
    # Only create high school views for football
    if is_football:
        # Football: Create platinum, gold, silver_plus, silver views
        if platinum_pkg is not None:
            views[f"vw_hs_athletes_wide_{suffix}_platinum"] = {
                "drop": "",
                "create": f"""CREATE OR REPLACE VIEW public.vw_hs_athletes_wide_{suffix}_platinum AS
SELECT t.* FROM intermediate.mv_hs_athletes_wide t
WHERE t.sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id = {platinum_pkg}
);"""
            }

        if gold_pkg is not None:
            views[f"vw_hs_athletes_wide_{suffix}_gold"] = {
                "drop": "",
                "create": f"""CREATE OR REPLACE VIEW public.vw_hs_athletes_wide_{suffix}_gold AS
SELECT t.* FROM intermediate.mv_hs_athletes_wide t
WHERE t.sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id = {gold_pkg}
);"""
            }

        if silver_plus_pkg is not None:
            views[f"vw_hs_athletes_wide_{suffix}_silver_plus"] = {
                "drop": "",
                "create": f"""CREATE OR REPLACE VIEW public.vw_hs_athletes_wide_{suffix}_silver_plus AS
SELECT t.* FROM intermediate.mv_hs_athletes_wide t
WHERE t.sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id = {silver_plus_pkg}
);"""
            }

        if silver_pkg is not None:
            views[f"vw_hs_athletes_wide_{suffix}_silver"] = {
                "drop": "",
                "create": f"""CREATE OR REPLACE VIEW public.vw_hs_athletes_wide_{suffix}_silver AS
SELECT t.* FROM intermediate.mv_hs_athletes_wide t
WHERE t.sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id = {silver_pkg}
);"""
            }

    # ===== JUCO VIEW (unchanged behavior if applicable) =====
    if suffix in ALLOWED_JUCO_SUFFIXES and juco_pkg is not None:
        views[f"vw_juco_athletes_wide_{suffix}"] = {
            "drop": "",
            "create": f"""CREATE OR REPLACE VIEW public.vw_juco_athletes_wide_{suffix} AS
SELECT t.* FROM intermediate.mv_juco_athletes_wide t  -- ← pointer
WHERE t.sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id IN ({juco_pkg})
);"""
        }

    # ===== ACTIVITY FEED VIEWS =====
    # Only create activity feed views for football
    if is_football:
        # Football: Create platinum, gold, silver_plus views
        if platinum_pkg is not None:
            views[f"vw_activity_feed_{suffix}_platinum"] = {
                "drop": "",
                "create": f"""CREATE OR REPLACE VIEW public.vw_activity_feed_{suffix}_platinum AS
SELECT t.* FROM intermediate.mv_activity_feed t
WHERE t.sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id = {platinum_pkg}
);"""
            }

        if gold_pkg is not None:
            views[f"vw_activity_feed_{suffix}_gold"] = {
                "drop": "",
                "create": f"""CREATE OR REPLACE VIEW public.vw_activity_feed_{suffix}_gold AS
SELECT t.* FROM intermediate.mv_activity_feed t
WHERE t.sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id = {gold_pkg}
);"""
            }

        if silver_plus_pkg is not None:
            views[f"vw_activity_feed_{suffix}_silver_plus"] = {
                "drop": "",
                "create": f"""CREATE OR REPLACE VIEW public.vw_activity_feed_{suffix}_silver_plus AS
SELECT t.* FROM intermediate.mv_activity_feed t
WHERE t.sport_id = {sport_id} AND EXISTS (
    SELECT 1 FROM public.user_package_access upa
    WHERE upa.user_id = auth.uid() 
      AND upa.customer_package_id = {silver_plus_pkg}
);"""
            }

    return views


def create_admin_views():
    """Create admin views for packages 3, 4, 5"""
    safe_print("[ADMIN VIEWS] Creating admin views...")
    
    # Admin package list
    _admin_pkg_list = ", ".join(str(p) for p in EXTRA_FULL_ACCESS_PKGS)  # "3, 4, 5"
    
    admin_views = {
        "vw_admin_college_athlete": {
            "drop": "DROP VIEW IF EXISTS public.vw_admin_college_athlete;",
            "create": f"""
CREATE VIEW public.vw_admin_college_athlete AS
SELECT t.*
FROM intermediate.mv_college_athletes_wide t
WHERE EXISTS (
  SELECT 1
  FROM public.user_package_access upa
  WHERE upa.user_id = auth.uid()
    AND upa.customer_package_id IN ({_admin_pkg_list})
);"""
        },
        "vw_admin_hs_athlete": {
            "drop": "DROP VIEW IF EXISTS public.vw_admin_hs_athlete;",
            "create": f"""
CREATE VIEW public.vw_admin_hs_athlete AS
SELECT t.*
FROM intermediate.mv_hs_athletes_wide t
WHERE EXISTS (
  SELECT 1
  FROM public.user_package_access upa
  WHERE upa.user_id = auth.uid()
    AND upa.customer_package_id IN ({_admin_pkg_list})
);"""
        },
        "vw_admin_juco_athlete": {
            "drop": "DROP VIEW IF EXISTS public.vw_admin_juco_athlete;",
            "create": f"""
CREATE VIEW public.vw_admin_juco_athlete AS
SELECT t.*
FROM intermediate.mv_juco_athletes_wide t
WHERE EXISTS (
  SELECT 1
  FROM public.user_package_access upa
  WHERE upa.user_id = auth.uid()
    AND upa.customer_package_id IN ({_admin_pkg_list})
);"""
        },
        "vw_admin_school": {
            "drop": "DROP VIEW IF EXISTS public.vw_admin_school;",
            "create": f"""
CREATE VIEW public.vw_admin_school AS
SELECT t.*
FROM intermediate.mv_school_fact_wide t
WHERE EXISTS (
  SELECT 1
  FROM public.user_package_access upa
  WHERE upa.user_id = auth.uid()
    AND upa.customer_package_id IN ({_admin_pkg_list})
);"""
        },
        "vw_high_school": {
            "drop": "DROP VIEW IF EXISTS public.vw_high_school;",
            "create": """
CREATE VIEW public.vw_high_school AS
SELECT *
FROM intermediate.mv_school_fact_wide
WHERE school_type = 'High School'
   OR (school_type = 'Junior College' AND juco_has_football = 'Yes');"""
        }
    }
    
    view_count = len(admin_views)
    safe_print(f"[ADMIN VIEWS] Total admin views to create: {view_count}")
    
    for i, (view_name, view_def) in enumerate(admin_views.items(), 1):
        safe_print(f"[ADMIN VIEWS] {i}/{view_count} - Creating {view_name}...")
        
        # Drop the view first
        run_sql(view_def["drop"])
        
        # Create the view
        run_sql(view_def["create"])

def create_high_school_view():
    """Create the high school view"""
    safe_print("[HIGH SCHOOL VIEW] Creating vw_high_school...")
    
    high_school_view = {
        "vw_high_school": {
            "drop": "DROP VIEW IF EXISTS public.vw_high_school;",
            "create": """
CREATE VIEW public.vw_high_school AS
SELECT *
FROM intermediate.mv_school_fact_wide
WHERE school_type = 'High School'
   OR (school_type = 'Junior College' AND juco_has_football = 'Yes');"""
        }
    }
    
    for view_name, view_def in high_school_view.items():
        safe_print(f"[HIGH SCHOOL VIEW] Creating {view_name}...")
        
        # Drop the view first
        run_sql(view_def["drop"])
        
        # Create the view
        run_sql(view_def["create"])

def create_activity_feed_views():
    """Create only activity feed views (football only)"""
    safe_print("[ACTIVITY FEED VIEWS] Creating activity feed views...")

    # Only create activity feed views for football
    fb_config = next((config for config in view_configs if config["suffix"] == "fb"), None)
    if not fb_config:
        safe_print("[ACTIVITY FEED VIEWS] ERROR: Football config not found!")
        return

    # Generate only activity feed views for football
    sport_views = build_view_statements(fb_config)

    # Filter to only activity feed views
    activity_feed_views = {k: v for k, v in sport_views.items() if "activity_feed" in k}

    view_count = len(activity_feed_views)
    safe_print(f"[ACTIVITY FEED VIEWS] Total activity feed views to create: {view_count}")

    for i, (view_name, view_def) in enumerate(activity_feed_views.items(), 1):
        safe_print(f"[ACTIVITY FEED VIEWS] {i}/{view_count} - Creating {view_name}...")

        # Only drop if it's not empty (some views don't need dropping)
        if view_def["drop"]:
            run_sql(view_def["drop"])

        run_sql(view_def["create"])


def create_public_views():
    """Create public views exactly as in original code"""
    safe_print("[PUBLIC VIEWS] Creating public views...")

    # Generate all sport-specific views using the original logic
    all_views = {}

    for i, config in enumerate(view_configs, 1):
        try:
            safe_print(f"[PUBLIC VIEWS] Processing sport {i}/{len(view_configs)}: {config['suffix']}")
            sport_views = build_view_statements(config)
            safe_print(f"[PUBLIC VIEWS] Generated {len(sport_views)} views for {config['suffix']}")
            all_views.update(sport_views)
        except Exception as e:
            safe_print(f"[PUBLIC VIEWS] ERROR generating views for {config['suffix']}: {e}")
            import traceback
            safe_print(f"[PUBLIC VIEWS] Traceback: {traceback.format_exc()}")
            raise

    # Create all views
    view_count = len(all_views)
    safe_print(f"[PUBLIC VIEWS] Total views to create: {view_count}")

    for i, (view_name, view_def) in enumerate(all_views.items(), 1):
        safe_print(f"[PUBLIC VIEWS] {i}/{view_count} - Creating {view_name}...")

        # Only drop if it's not empty (some views don't need dropping)
        if view_def["drop"]:
            run_sql(view_def["drop"])

        run_sql(view_def["create"])


def create_source_table_indexes():
    """Create indexes on source tables for better performance."""
    safe_print("[SOURCE INDEXES] Creating indexes on source tables...")

    source_indexes = [
        # athlete_fact table indexes
        "CREATE INDEX IF NOT EXISTS idx_athlete_fact_athlete_id ON athlete_fact (athlete_id);",
        "CREATE INDEX IF NOT EXISTS idx_athlete_fact_data_type_id ON athlete_fact (data_type_id);",
        "CREATE INDEX IF NOT EXISTS idx_athlete_fact_inactive ON athlete_fact (inactive) WHERE inactive IS NULL;",
        "CREATE INDEX IF NOT EXISTS idx_athlete_fact_created_at ON athlete_fact (created_at);",

        # school_fact table indexes
        "CREATE INDEX IF NOT EXISTS idx_school_fact_school_id ON school_fact (school_id);",
        "CREATE INDEX IF NOT EXISTS idx_school_fact_data_type_id ON school_fact (data_type_id);",
        "CREATE INDEX IF NOT EXISTS idx_school_fact_inactive ON school_fact (inactive) WHERE inactive IS NULL;",
        "CREATE INDEX IF NOT EXISTS idx_school_fact_created_at ON school_fact (created_at);",

        # stat table indexes
        "CREATE INDEX IF NOT EXISTS idx_stat_athlete_id ON stat (athlete_id);",
        "CREATE INDEX IF NOT EXISTS idx_stat_data_type_id ON stat (data_type_id);",
        "CREATE INDEX IF NOT EXISTS idx_stat_season ON stat (season);",
        "CREATE INDEX IF NOT EXISTS idx_stat_game_id ON stat (game_id) WHERE game_id IS NULL;",

        # athlete_school table indexes
        "CREATE INDEX IF NOT EXISTS idx_athlete_school_athlete_id ON athlete_school (athlete_id);",
        "CREATE INDEX IF NOT EXISTS idx_athlete_school_school_id ON athlete_school (school_id);",
        "CREATE INDEX IF NOT EXISTS idx_athlete_school_end_date ON athlete_school (end_date) WHERE end_date IS NULL;",

        # athlete_honor table indexes
        "CREATE INDEX IF NOT EXISTS idx_athlete_honor_athlete_id ON athlete_honor (athlete_id);",
        "CREATE INDEX IF NOT EXISTS idx_athlete_honor_award ON athlete_honor (award);",

        # offer table indexes
        "CREATE INDEX IF NOT EXISTS idx_offer_athlete_id ON offer (athlete_id);",
        "CREATE INDEX IF NOT EXISTS idx_offer_school_id ON offer (school_id);",
        "CREATE INDEX IF NOT EXISTS idx_offer_type ON offer (type);",
        "CREATE INDEX IF NOT EXISTS idx_offer_created_at ON offer (created_at);",

        # athlete table indexes
        "CREATE INDEX IF NOT EXISTS idx_athlete_sport_id ON athlete (sport_id);",

        # school table indexes
        "CREATE INDEX IF NOT EXISTS idx_school_name ON school (name);"
    ]

    for i, idx in enumerate(source_indexes, 1):
        safe_print(f"[SOURCE INDEXES] {i}/{len(source_indexes)} - Creating source table index...")
        try:
            run_sql(idx)
        except Exception as e:
            safe_print(f"[SOURCE INDEXES] Source index {i} failed (may already exist): {e}")


def test_connection():
    """Test basic database connectivity and permissions."""
    safe_print("[TEST] Testing database connection...")

    try:
        # Test basic connection
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()[0]
            safe_print(f"[TEST] Connected to: {version[:50]}...")

            # Test if intermediate schema exists
            cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'intermediate';")
            schema_exists = cur.fetchone()
            if schema_exists:
                safe_print("[TEST] intermediate schema exists")
            else:
                safe_print("[TEST] intermediate schema does not exist - will be created")

            # Test permissions
            cur.execute("SELECT current_user, session_user;")
            user_info = cur.fetchone()
            safe_print(f"[TEST] Running as user: {user_info[0]}")

            # Test simple DROP (should not fail even if object doesn't exist)
            cur.execute("DROP MATERIALIZED VIEW IF EXISTS intermediate.test_mv CASCADE;")
            safe_print("[TEST] DROP permissions OK")

    except Exception as e:
        safe_print(f"[TEST] Connection test failed: {e}")
        raise
    finally:
        if 'conn' in locals():
            conn.close()


def main():
    """Main execution function."""
    start_time = datetime.datetime.now()
    safe_print(f"== Clean DB Builder starting @ {start_time.isoformat()} ==")

    try:
        # Test connection first
        test_connection()

        if CREATE_VIEWS_ONLY:
            # Only create public views (skip MV creation)
            safe_print("\n[VIEWS ONLY] Creating public views...")
            
            # Create all public views
            create_public_views()
            
            # Create admin views
            create_admin_views()
            
            # Create high school view
            create_high_school_view()
            
        elif REFRESH_ACTIVITY_FEED_ONLY:
            # Only refresh activity feed MV and views
            safe_print("\n[ACTIVITY FEED ONLY] Refreshing activity feed materialized view and views...")

            # Define activity feed MV creation SQL
            mv_activity_feed_create = """
            CREATE MATERIALIZED VIEW intermediate.mv_activity_feed AS
            SELECT 
                o.id AS offer_id,
                o.created_at AS offer_created_at,
                o.source,
                o.type,
                o.coach_ask_to_remove,
                o.ended_at,
                o.walk_on,
                o.offer_date,
                a.sport_id,
                a.first_name,
                a.last_name,
                a.school_name as ath_school,
                a.school_id as ath_school_id,
                -- === Athlete's current school (2nd SFW join, prefixed ath_school_*) ===
                sfw_ath.address_city AS ath_school_address_city,
                sfw_ath.school_state AS ath_school_school_state,
                sfw_ath.county_id AS ath_school_county_id,
                sfw_ath.address_latitude AS ath_school_address_latitude,
                sfw_ath.address_longitude AS ath_school_address_longitude,
                sfw_ath.school_type AS ath_school__school_type,
                -- === Athlete Fact Wide (prefixed) ===
                afw.athlete_id AS afw_athlete_id,
                afw.year AS afw_year,
                afw.primary_position AS afw_primary_position,
                CASE WHEN afw.height_feet ~ '^-?\\d+(\\.\\d+)?$' THEN afw.height_feet::NUMERIC END AS afw_height_feet,
                CASE WHEN afw.height_inch ~ '^-?\\d+(\\.\\d+)?$' THEN afw.height_inch::NUMERIC END AS afw_height_inch,
                CASE WHEN afw.weight ~ '^-?\\d+(\\.\\d+)?$' THEN afw.weight::NUMERIC END AS afw_weight,
                afw.high_school AS afw_high_school,
                afw.previous_schools AS afw_previous_schools,
                afw.major AS afw_major,
                afw.twitter AS afw_twitter,
                afw.club AS afw_club,
                afw.hand AS afw_hand,
                afw.image_url AS afw_image_url,
                afw.address_state AS afw_address_state,
                afw.elig_remaining AS afw_elig_remaining,
                CASE WHEN afw.gpa ~ '^-?\\d+(\\.\\d+)?$' THEN afw.gpa::NUMERIC END AS afw_gpa,
                afw.highlight AS afw_highlight,
                afw.summer_league AS afw_summer_league,
                afw.survey_completed AS afw_survey_completed,
                afw.is_receiving_athletic_aid AS afw_is_receiving_athletic_aid,
                afw.faith_based_school AS afw_faith_based_school,
                afw.track_wrestling_profile AS afw_track_wrestling_profile,
                afw.wrestle_stat_link AS afw_wrestle_stat_link,
                afw.stats_url AS afw_stats_url,
                CASE WHEN afw.roster_year ~ '^-?\\d+(\\.\\d+)?$' THEN afw.roster_year::NUMERIC END AS afw_roster_year,
                afw.utr_link AS afw_utr_link,
                afw.long_jump AS afw_long_jump,
                afw.college_career_score AS afw_college_career_score,
                afw.hs_career_score AS afw_hs_career_score,
                afw.football_career_score AS afw_football_career_score,
                afw.predicted_transfer_destination AS afw_predicted_transfer_destination,
                CASE WHEN afw.transfer_odds ~ '^-?\\d+(\\.\\d+)?$' THEN afw.transfer_odds::NUMERIC END AS afw_transfer_odds,
                afw.up_predictions AS afw_up_predictions,
                afw.down_predictions AS afw_down_predictions,
                afw.flat_predictions AS afw_flat_predictions,
                afw.risk_category AS afw_risk_category,
                afw.pred_direction AS afw_pred_direction,
                afw.rivals_rating AS afw_rivals_rating,
                afw.shot_put AS afw_shot_put,
                afw.forty AS afw_forty,
                afw.shuttle AS afw_shuttle,
                afw.three_cone AS afw_three_cone,
                afw.broad_jump AS afw_broad_jump,
                afw.vert_jump AS afw_vert_jump,
                afw.roster_link AS afw_roster_link,
                afw.athletic_projection AS afw_athletic_projection,
                CASE WHEN afw.grad_year ~ '^-?\\d+(\\.\\d+)?$' THEN afw.grad_year::NUMERIC END AS afw_grad_year,
                afw.hs_highlight AS afw_hs_highlight,
                CASE WHEN afw.sat ~ '^-?\\d+(\\.\\d+)?$' THEN afw.sat::NUMERIC END AS afw_sat,
                CASE WHEN afw.act ~ '^-?\\d+(\\.\\d+)?$' THEN afw.act::NUMERIC END AS afw_act,
                afw.gpa_type AS afw_gpa_type,
                afw.hs_coach_hide AS afw_hs_coach_hide,
                afw.best_offer AS afw_best_offer,
                afw.income AS afw_income,
                afw.added_date AS afw_added_date,
                afw.last_major_change AS afw_last_major_change,
                afw.on3_consensus_rating AS afw_on3_consensus_rating,
                afw.on3_rating AS afw_on3_rating,
                afw._247_rating AS afw__247_rating,
                afw.espn_rating AS afw_espn_rating,
                afw.on3_consensus_stars AS afw_on3_consensus_stars,
                afw.on3_stars AS afw_on3_stars,
                afw._247_stars AS afw__247_stars,
                afw.espn_stars AS afw_espn_stars,
                afw.income_category AS afw_income_category,
                -- === School Fact Wide (prefixed) ===
                sfw.school_id AS sfw_school_id,
                sfw.school_name AS sfw_school_name,
                sfw.msoc_conference AS sfw_msoc_conference,
                sfw.school_type AS sfw_school_type,
                sfw.athletic_association AS sfw_athletic_association,
                sfw.division AS sfw_division,
                sfw.sub_division AS sfw_sub_division,
                sfw.bsb_conference AS sfw_bsb_conference,
                sfw.fbs_conf_group AS sfw_fbs_conf_group,
                sfw.school_state AS sfw_school_state,
                sfw.academic_ranking AS sfw_academic_ranking,
                sfw.conference AS sfw_conference,
                sfw.wbb_conference AS sfw_wbb_conference,
                sfw.mbb_conference AS sfw_mbb_conference,
                sfw.wvol_conference AS sfw_wvol_conference,
                sfw.sb_conference AS sfw_sb_conference,
                sfw.mlax_conference AS sfw_mlax_conference,
                sfw.wlax_conference AS sfw_wlax_conference,
                sfw.mten_conference AS sfw_mten_conference,
                sfw.wten_conference AS sfw_wten_conference,
                sfw.mglf_conference AS sfw_mglf_conference,
                sfw.wglf_conference AS sfw_wglf_conference,
                sfw.mtaf_conference AS sfw_mtaf_conference,
                sfw.wtaf_conference AS sfw_wtaf_conference,
                sfw.mswm_conference AS sfw_mswm_conference,
                sfw.wswm_conference AS sfw_wswm_conference,
                sfw.mwre_conference AS sfw_mwre_conference,
                sfw.wsoc_conference AS sfw_wsoc_conference,
                sfw.juco_region AS sfw_juco_region,
                sfw.juco_division AS sfw_juco_division,
                sfw.juco_has_football AS sfw_juco_has_football,
                sfw.address_state AS sfw_address_state,
                sfw.academics AS sfw_academics,
                sfw.address_latitude AS sfw_address_latitude,
                sfw.address_longitude AS sfw_address_longitude,
                sfw.college_player_producing AS sfw_college_player_producing,
                sfw.d1_player_producing AS sfw_d1_player_producing,
                sfw.team_quality AS sfw_team_quality,
                sfw.athlete_income AS sfw_athlete_income,
                sfw.county_id AS sfw_county_id,
                sfw.affiliation AS sfw_affiliation,
                sfw.private_public AS sfw_private_public,
                sfw.hs_state AS sfw_hs_state,
                sfw.hc_name AS sfw_hc_name,
                sfw.hc_email AS sfw_hc_email,
                sfw.hc_number AS sfw_hc_number,
                sfw.hs_county AS sfw_hs_county,
                agg.counts_by_group AS offer_counts_by_group
            FROM offer o
            LEFT JOIN intermediate.mv_athlete_fact_wide afw ON afw.athlete_id = o.athlete_id
            LEFT JOIN intermediate.mv_school_fact_wide sfw ON sfw.school_id = o.school_id
            LEFT JOIN athlete_with_school a ON a.id = o.athlete_id
            LEFT JOIN intermediate.mv_school_fact_wide sfw_ath ON sfw_ath.school_id = a.school_id
            LEFT JOIN LATERAL (
                SELECT COALESCE(
                    jsonb_object_agg(category, cnt ORDER BY category),
                    '{}'::jsonb
                ) AS counts_by_group
                FROM (
                    SELECT sf.value AS category, COUNT(*) AS cnt
                    FROM offer o2
                    JOIN school_fact sf ON sf.school_id = o2.school_id AND sf.data_type_id = 252
                    WHERE o2.type = 'offer' AND o2.athlete_id = o.athlete_id
                    GROUP BY sf.value
                ) t
            ) agg ON TRUE
            WHERE o.coach_ask_to_remove IS NULL
            WITH DATA;
            """

            # Drop and recreate activity feed MV
            safe_print("[ACTIVITY FEED] Dropping mv_activity_feed...")
            run_sql("DROP MATERIALIZED VIEW IF EXISTS intermediate.mv_activity_feed CASCADE;")

            safe_print("[ACTIVITY FEED] Creating mv_activity_feed...")
            run_sql(mv_activity_feed_create)

            # Create indexes for activity feed MV
            safe_print("[ACTIVITY FEED] Creating indexes for mv_activity_feed...")
            create_indexes_for_mv("mv_activity_feed")

            # Create only activity feed views (football only)
            safe_print("[ACTIVITY FEED] Creating activity feed views...")
            create_activity_feed_views()
            
            # Create high school view
            safe_print("[ACTIVITY FEED] Creating high school view...")
            create_high_school_view()

        else:
            # Full build process
            # Step 1: Create source table indexes for better performance (only if needed)
            if CREATE_SOURCE_INDEXES:
                safe_print("\n[STEP 1] Creating source table indexes...")
                create_source_table_indexes()
                safe_print("[INFO] Set CREATE_SOURCE_INDEXES = False to skip this step in future runs")
            else:
                safe_print("\n[STEP 1] Skipping source table indexes (CREATE_SOURCE_INDEXES = False)")

            # Step 2: Create materialized views with data and indexes
            step_num = 2 if CREATE_SOURCE_INDEXES else 1
            safe_print(f"\n[STEP {step_num}] Creating materialized views with data and indexes...")
            create_materialized_views()

            # Step 3: Create public views
            step_num = 3 if CREATE_SOURCE_INDEXES else 2
            safe_print(f"\n[STEP {step_num}] Creating public views...")
            create_public_views()
            
            # Step 4: Create admin views
            step_num = 4 if CREATE_SOURCE_INDEXES else 3
            safe_print(f"\n[STEP {step_num}] Creating admin views...")
            create_admin_views()
            
            # Step 5: Create high school view
            step_num = 5 if CREATE_SOURCE_INDEXES else 4
            safe_print(f"\n[STEP {step_num}] Creating high school view...")
            create_high_school_view()

        end_time = datetime.datetime.now()
        duration = end_time - start_time
        safe_print(f"\n== Clean DB Builder completed @ {end_time.isoformat()} ==")
        safe_print(f"Total duration: {duration}")

    except Exception as e:
        safe_print(f"\n[ERROR] Build failed: {e}")
        raise


if __name__ == "__main__":
    main()
