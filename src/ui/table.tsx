'use client';
import { useEffect, useState } from 'react';
import { fetchAthleteData } from '../lib/queries';
import { AthleteData } from '../types/database';
import Link from 'next/link';

type TableProps = {
  tableName: string;
};

export default function Table({ tableName }: TableProps) {
  const [data, setData] = useState<AthleteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter data based on search term
  const filteredData = data.filter((row) => {
    const searchString = searchTerm.toLowerCase();
    return (
      row.first_name?.toLowerCase().includes(searchString) ||
      row.last_name?.toLowerCase().includes(searchString) ||
      row.year?.toString().toLowerCase().includes(searchString) ||
      row.school?.name?.toLowerCase().includes(searchString) ||
      row.school?.division?.toLowerCase().includes(searchString) ||
      row.primary_position?.toLowerCase().includes(searchString) ||
      row.hometown_state?.toLowerCase().includes(searchString) ||
      row.initiated_date?.toLowerCase().includes(searchString)
    );
  });

  // Calculate pagination based on filtered data
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // Create display columns list based on the table structure
        const displayColumns = [
          'initiated_date',
          'year',
          'division',
          'position',
          'state',
          'athletic_aid',
          'gp',
          'gs',
          'goals',
          'ast',
          'gk_min'
        ];

        const { data: athleteData } = await fetchAthleteData('msoc', {
          displayColumns,
          userPackages: [], // This will be fetched automatically by fetchAthleteData
        });
        setData(athleteData);
      } catch (err) {
        setError('Unable to load athlete data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="overflow-x-auto px-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-2xl font-semibold text-center">Men&apos;s Soccer Athletes</h2>
        
        {/* Search Input */}
        <div className="flex items-center gap-2">
          <label htmlFor="search">Search:</label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="border border-gray-300 rounded px-3 py-1 w-64"
          />
        </div>

        {/* Existing rows per page selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="rowsPerPage">Rows per page:</label>
          <select
            id="rowsPerPage"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={filteredData.length}>All</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-lg">Loading data...</div>
      ) : error ? (
        <div className="text-center text-lg text-red-600">{error}</div>
      ) : (
        <>
          {filteredData.length === 0 ? (
            <div className="text-center text-lg text-gray-600 my-4">
              No results found for &quot;{searchTerm}&quot;
            </div>
          ) : (
            <>
              <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-md border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">Initiated Date</th>
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">Name</th>
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">Year</th>
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">College</th>
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">Division</th>
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">Pos</th>
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">State</th>
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">$</th>
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">GP</th>
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">GS</th>
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">Goals</th>
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">Ast</th>
                    <th className="py-3 px-5 text-left font-semibold text-gray-700 border border-gray-300">GK Min</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((row) => (
                    <tr
                      key={`${row.first_name}-${row.last_name}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="py-3 px-5 text-gray-800 border border-gray-300">{row.initiated_date}</td>
                      <td className="py-3 px-5 text-gray-800 border border-gray-300">
                        <Link 
                          href={`/pre-portal-search?id=${row.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {`${row.first_name} ${row.last_name}`}
                        </Link>
                      </td>
                      <td className="py-3 px-5 text-gray-800 border border-gray-300">{row.year}</td>
                      <td className="py-3 px-5 text-gray-800 border border-gray-300">{row.school?.name}</td>
                      <td className="py-3 px-5 text-gray-800 border border-gray-300">{row.school?.division}</td>
                      <td className="py-3 px-5 text-gray-800 border border-gray-300">
                        {row.primary_position || ''}
                      </td>
                      <td className="py-3 px-5 text-gray-800 border border-gray-300">
                        {row.hometown_state || ''}
                      </td>
                      <td className="py-3 px-5 text-gray-800 border border-gray-300">
                        {row.details_tp_page?.[0]?.is_receiving_athletic_aid === 'Yes' ? '✓' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, filteredData.length)} of {filteredData.length} entries
                  {searchTerm && ` (filtered from ${data.length} total entries)`}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}



