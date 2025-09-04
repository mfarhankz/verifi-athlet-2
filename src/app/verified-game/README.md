# Verified Game Feature

This feature allows users to create weeks and games, make picks for games, and view a leaderboard of results.

## Features

- Create and manage weeks
- Create and manage games within weeks
- Users can make picks for games
- Picks are hidden until a game starts
- Admins can declare winners and award points
- Leaderboard to track user points

## Database Setup

To set up the necessary database tables and functions, follow these steps:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of the `supabase-sql-function.sql` file
4. Run the SQL script to create the tables and functions

## Database Schema

The feature uses the following tables:

### verified_game_teams
- `id`: UUID (Primary Key)
- `school`: TEXT (Team school name)
- `logo_url`: TEXT (Optional team logo URL)
- `created_at`: TIMESTAMP

### verified_game_weeks
- `id`: UUID (Primary Key)
- `name`: TEXT (Week name, e.g., "Week 1")
- `created_at`: TIMESTAMP

### verified_game_games
- `id`: UUID (Primary Key)
- `week_id`: UUID (Foreign Key to verified_game_weeks)
- `team1_id`: UUID (Foreign Key to verified_game_teams)
- `team2_id`: UUID (Foreign Key to verified_game_teams)
- `winner_id`: UUID (Foreign Key to verified_game_teams, nullable)
- `has_started`: BOOLEAN (Whether the game has started)
- `created_at`: TIMESTAMP

### verified_game_user_picks
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to auth.users)
- `game_id`: UUID (Foreign Key to verified_game_games)
- `team_id`: UUID (Foreign Key to verified_game_teams)
- `created_at`: TIMESTAMP

## User Flow

1. Admin creates weeks
2. Admin creates games within weeks
3. Users make picks for games before they start
4. Admin marks a game as started (picks are now visible)
5. Admin declares a winner for the game
6. Users who picked correctly get 1 point
7. Leaderboard shows user rankings

## Access Control

- Only admins can create weeks and games
- Only admins can start games and declare winners
- All users can make picks for games that haven't started
- Users cannot see other users' picks until a game has started 