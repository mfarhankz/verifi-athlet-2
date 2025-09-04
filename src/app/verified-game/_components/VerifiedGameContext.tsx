"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchUserDetails } from '@/utils/utils';

// Define types for our data
export interface Week {
  id: string;
  name: string;
  created_at: string;
}

export interface Team {
  id: string;
  school: string;
  logo_url?: string;
}

export interface Game {
  id: string;
  week_id: string;
  team1_id: string;
  team2_id: string;
  team1?: Team;
  team2?: Team;
  winner_id?: string;
  has_started: boolean;
  created_at: string;
}

export interface UserPick {
  id: string;
  user_id: string;
  game_id: string;
  team_id: string;
  created_at: string;
}

interface VerifiedGameContextType {
  weeks: Week[];
  games: Game[];
  teams: Team[];
  userPicks: UserPick[];
  selectedWeek: string | null;
  currentUser: any;
  isAdmin: boolean;
  userPackages: string[];
  loading: boolean;
  fetchWeeks: () => Promise<void>;
  fetchGames: (weekId: string) => Promise<void>;
  fetchTeams: () => Promise<void>;
  fetchUserPicks: () => Promise<void>;
  createWeek: (name: string) => Promise<void>;
  createGame: (weekId: string, team1Id: string, team2Id: string) => Promise<void>;
  createTeam: (name: string, logoUrl?: string) => Promise<void>;
  makeUserPick: (gameId: string, teamId: string) => Promise<void>;
  startGame: (gameId: string) => Promise<void>;
  declareWinner: (gameId: string, teamId: string) => Promise<void>;
  setSelectedWeek: (weekId: string | null) => void;
}

const VerifiedGameContext = createContext<VerifiedGameContextType | undefined>(undefined);

export const useVerifiedGame = () => {
  const context = useContext(VerifiedGameContext);
  if (context === undefined) {
    throw new Error('useVerifiedGame must be used within a VerifiedGameProvider');
  }
  return context;
};

export const VerifiedGameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userPicks, setUserPicks] = useState<UserPick[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPackages, setUserPackages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setCurrentUser(session.user);
          
          // Fetch user details including packages
          const userDetails = await fetchUserDetails();
          if (userDetails) {
            setUserPackages(userDetails.packages || []);
            
            // Check if user is admin (has access to package ID '3')
            setIsAdmin((userDetails.packages || []).includes('3'));
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch weeks
  const fetchWeeks = async () => {
    try {
      const { data, error } = await supabase
        .from('verified_game_weeks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setWeeks(data || []);
      
      // Set selected week to the first week if none is selected
      if (data && data.length > 0 && !selectedWeek) {
        setSelectedWeek(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching weeks:', error);
    }
  };

  // Fetch games for a specific week
  const fetchGames = async (weekId: string) => {
    try {
      const { data, error } = await supabase
        .from('verified_game_games')
        .select(`
          *,
          team1:team1_id(id, school, logo_url),
          team2:team2_id(id, school, logo_url)
        `)
        .eq('week_id', weekId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  // Fetch teams
  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('verified_game_teams')
        .select('*')
        .order('school', { ascending: true });
      
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  // Fetch user picks
  const fetchUserPicks = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('verified_game_user_picks')
        .select('*')
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      setUserPicks(data || []);
    } catch (error) {
      console.error('Error fetching user picks:', error);
    }
  };

  // Create a new week
  const createWeek = async (name: string) => {
    try {
      const { error } = await supabase
        .from('verified_game_weeks')
        .insert([{ name }]);
      
      if (error) throw error;
      await fetchWeeks();
    } catch (error) {
      console.error('Error creating week:', error);
    }
  };

  // Create a new game
  const createGame = async (weekId: string, team1Id: string, team2Id: string) => {
    try {
      const { error } = await supabase
        .from('verified_game_games')
        .insert([{ 
          week_id: weekId, 
          team1_id: team1Id, 
          team2_id: team2Id,
          has_started: false
        }]);
      
      if (error) throw error;
      await fetchGames(weekId);
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  // Create a new team
  const createTeam = async (name: string, logoUrl?: string) => {
    try {
      const { error } = await supabase
        .from('verified_game_teams')
        .insert([{ 
          school: name,
          logo_url: logoUrl
        }]);
      
      if (error) throw error;
      await fetchTeams();
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  // Make a user pick
  const makeUserPick = async (gameId: string, teamId: string) => {
    if (!currentUser) return;
    
    try {
      // Check if user already has a pick for this game
      const { data: existingPicks } = await supabase
        .from('verified_game_user_picks')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('game_id', gameId);
      
      // If user already has a pick, update it
      if (existingPicks && existingPicks.length > 0) {
        const { error } = await supabase
          .from('verified_game_user_picks')
          .update({ team_id: teamId })
          .eq('id', existingPicks[0].id);
        
        if (error) throw error;
      } else {
        // Otherwise, create a new pick
        const { error } = await supabase
          .from('verified_game_user_picks')
          .insert([{ 
            user_id: currentUser.id,
            game_id: gameId,
            team_id: teamId
          }]);
        
        if (error) throw error;
      }
      
      await fetchUserPicks();
    } catch (error) {
      console.error('Error making user pick:', error);
    }
  };

  // Start a game
  const startGame = async (gameId: string) => {
    try {
      const { error } = await supabase
        .from('verified_game_games')
        .update({ has_started: true })
        .eq('id', gameId);
      
      if (error) throw error;
      
      // Refresh games for the current week
      if (selectedWeek) {
        await fetchGames(selectedWeek);
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  // Declare a winner
  const declareWinner = async (gameId: string, teamId: string) => {
    try {
      const { error } = await supabase
        .from('verified_game_games')
        .update({ winner_id: teamId })
        .eq('id', gameId);
      
      if (error) throw error;
      
      // Refresh games for the current week
      if (selectedWeek) {
        await fetchGames(selectedWeek);
      }
    } catch (error) {
      console.error('Error declaring winner:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    if (!loading) {
      fetchWeeks();
      fetchTeams();
      fetchUserPicks();
    }
  }, [loading]);

  // Fetch games when selected week changes
  useEffect(() => {
    if (selectedWeek) {
      fetchGames(selectedWeek);
    }
  }, [selectedWeek]);

  const value = {
    weeks,
    games,
    teams,
    userPicks,
    selectedWeek,
    currentUser,
    isAdmin,
    userPackages,
    loading,
    fetchWeeks,
    fetchGames,
    fetchTeams,
    fetchUserPicks,
    createWeek,
    createGame,
    createTeam,
    makeUserPick,
    startGame,
    declareWinner,
    setSelectedWeek
  };

  return (
    <VerifiedGameContext.Provider value={value}>
      {children}
    </VerifiedGameContext.Provider>
  );
}; 