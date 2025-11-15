// src/components/Stats.tsx

import React, { useState, useEffect } from 'react';
// Corrected the import path to find the supabase client
import { supabase } from '../lib/supabase'; 
import { Users, FileText, MessageSquare, Heart, Loader2, Database, AlertTriangle } from 'lucide-react';

// Define the tables you want to get counts for.
// Adjust this list to match your actual Supabase tables.
const TABLES_TO_COUNT = [
  { name: 'profiles', icon: Users, description: 'Total User Accounts' },
  { name: 'posts', icon: FileText, description: 'Total Content Posts' },
  { name: 'messages', icon: MessageSquare, description: 'Total Messages' },
  { name: 'likes', icon: Heart, description: 'Total Likes/Reactions' },
  { name: 'comments', icon: MessageSquare, description: 'Total Comments' },
];

// Type definition for the fetched stats data
type TableCount = {
  name: string;
  count: number | 'Error';
  error: boolean;
  errorMessage?: string; // Added optional error message field
};

export const Stats: React.FC = () => {
  const [stats, setStats] = useState<TableCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      setInitialLoadError(null);
      const fetchPromises = TABLES_TO_COUNT.map(async (table) => {
        try {
          // Supabase's count method: select('*', { count: 'exact', head: true })
          // head: true makes the query return 0 rows of data, only metadata (count).
          // We don't use array indexing/early returns here to ensure all promises resolve
          // and we get the error state for tables that fail.
          const { count, error } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true });

          if (error) {
            console.error(`Error counting table ${table.name}:`, error);
            // Check for the most common error: table does not exist
            const errorMessage = error.code === '42P01' ? `(Table "${table.name}" not found)` : `(DB Error: ${error.message})`;
            return { name: table.name, count: 'Error', error: true, errorMessage };
          }
          return { name: table.name, count: count || 0, error: false };
        } catch (e) {
          console.error(`Unexpected error fetching count for ${table.name}:`, e);
          const errorMessage = e instanceof Error ? e.message : 'Unknown Network/Unexpected Error';
          return { name: table.name, count: 'Error', error: true, errorMessage: `(${errorMessage})` };
        }
      });

      try {
        const results = await Promise.all(fetchPromises);
        setStats(results as TableCount[]);
      } catch (e) {
        // This catch block usually handles errors from Promise.all itself, 
        // which should be rare since we handle individual promise failures inside the map.
        setInitialLoadError('Failed to fetch statistics due to a critical, unexpected error.');
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  const getTableIcon = (tableName: string) => {
    const table = TABLES_TO_COUNT.find(t => t.name === tableName);
    return table?.icon || Database;
  };

  if (initialLoadError) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-red-100 border border-red-400 rounded-lg shadow-xl">
        <h2 className="flex items-center text-xl font-bold text-red-800 mb-4">
          <AlertTriangle className="mr-2 h-6 w-6" /> Statistics Load Error
        </h2>
        <p className="text-red-700">{initialLoadError}</p>
        <p className="text-red-700 mt-2">Please check your network connection and Supabase configuration.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center mb-8">
        <h2 className="text-4xl font-extrabold text-[rgb(var(--color-text))] tracking-tight">
          Platform Statistics
        </h2>
        <p className="ml-3 mt-1 text-lg text-[rgb(var(--color-text-secondary))]">
          Real-time entry counts from the database.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--color-primary))]" />
            <span className="ml-3 text-lg text-[rgb(var(--color-text-secondary))]">Loading Stats...</span>
          </div>
        ) : (
          stats.map((stat) => {
            const Icon = getTableIcon(stat.name);
            const tableConfig = TABLES_TO_COUNT.find(t => t.name === stat.name);

            return (
              <div
                key={stat.name}
                className={`p-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl
                  ${stat.error ? 'bg-red-50 border border-red-200' : 'bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]'}
                `}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`p-3 rounded-full ${stat.error ? 'bg-red-500' : 'bg-[rgba(var(--color-primary),0.1)]'}`}
                  >
                    <Icon
                      className={`h-6 w-6 ${stat.error ? 'text-white' : 'text-[rgb(var(--color-primary))]'}`}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-[rgb(var(--color-text-secondary))] uppercase tracking-wider">
                    {tableConfig?.description || stat.name.toUpperCase()}
                  </p>
                  {stat.error ? (
                    <div className="flex items-center mt-1 text-2xl font-bold text-red-600">
                      <AlertTriangle className="h-5 w-5 mr-1" />
                      ERROR
                    </div>
                  ) : (
                    <p className="mt-1 text-4xl font-extrabold text-[rgb(var(--color-text))]">
                      {stat.count.toLocaleString()}
                    </p>
                  )}
                  {stat.error && (
                      <p className="text-xs text-red-500 mt-1">
                          {stat.errorMessage}
                      </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
