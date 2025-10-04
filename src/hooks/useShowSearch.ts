import { useState, useEffect } from 'react';
import { Show } from './useShowsAPI';

export const useShowSearch = (shows: Show[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredShows, setFilteredShows] = useState<Show[]>([]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredShows(shows);
    } else {
      const filtered = shows.filter(show =>
        show.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        show.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredShows(filtered);
    }
  }, [shows, searchTerm]);

  const clearSearch = () => setSearchTerm('');

  return {
    searchTerm,
    setSearchTerm,
    filteredShows,
    clearSearch,
  };
};
