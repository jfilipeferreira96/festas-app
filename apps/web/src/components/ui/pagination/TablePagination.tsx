type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const TablePagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const pagesAroundCurrent = Array.from(
    { length: Math.min(3, totalPages) },
    (_, i) => i + Math.max(currentPage - 1, 1)
  );

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center justify-center h-10 px-3.5 py-2.5 text-sm rounded-lg border border-border bg-surface text-text-primary shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Anterior
      </button>
      <div className="flex items-center gap-1">
        {currentPage > 3 && <span className="px-2 text-text-muted">...</span>}
        {pagesAroundCurrent.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex items-center justify-center w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
              currentPage === page
                ? "bg-brand-500 text-white"
                : "text-text-primary hover:bg-gray-100"
            }`}
          >
            {page}
          </button>
        ))}
        {currentPage < totalPages - 2 && <span className="px-2 text-text-muted">...</span>}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center justify-center h-10 px-3.5 py-2.5 text-sm rounded-lg border border-border bg-surface text-text-primary shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Próximo
      </button>
    </div>
  );
};

export default TablePagination;
