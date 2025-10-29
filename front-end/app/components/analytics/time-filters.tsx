type TimeFiltersProps = {
  filters: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
};

export function TimeFilters({ filters, activeFilter, onFilterChange }: TimeFiltersProps) {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-2">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onFilterChange(filter)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeFilter === filter
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
} 