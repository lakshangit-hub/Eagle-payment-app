import React, { useState } from 'react';
import { Customer, Facility } from '../types';
import { formatMoney } from '../utils/format';
import { Search as SearchIcon, ChevronRight } from 'lucide-react';
import { playKeyClick } from '../utils/audio';

interface SearchScreenProps {
  customers: Customer[];
  facilities: Facility[];
  onSelectCustomer: (customer: Customer) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  customers,
  facilities,
  onSelectCustomer,
}) => {
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');

  const handleSearch = () => {
    playKeyClick();
    setAppliedQuery(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const cleanApplied = appliedQuery.trim().toLowerCase();

  // Find customers matching either directly or through their facilities
  const matchedCustomers = customers.filter((c) => {
    if (!cleanApplied) return true;
    const directMatch =
      c.name.toLowerCase().includes(cleanApplied) ||
      c.id.toLowerCase().includes(cleanApplied) ||
      c.nic.toLowerCase().includes(cleanApplied) ||
      c.phone.toLowerCase().includes(cleanApplied) ||
      (c.phone2 && c.phone2.toLowerCase().includes(cleanApplied));
    if (directMatch) return true;

    const userFacilities = facilities.filter((f) => f.customerId === c.id);
    return userFacilities.some(
      (f) =>
        f.no.toLowerCase().includes(cleanApplied) ||
        f.product.toLowerCase().includes(cleanApplied) ||
        (f.vehicle && f.vehicle.toLowerCase().includes(cleanApplied))
    );
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#7183a3] mb-1">
          Field Collection
        </div>
        <h1 className="text-2xl font-bold text-[#172b4d] tracking-tight">Search</h1>
      </div>

      {/* Search Input Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Name, NIC or Loan Number"
            aria-label="Search customers"
            className="w-full bg-white border border-[#d6e0ef] focus:border-[#2474e8] focus:ring-3 focus:ring-[#2474e8]/20 rounded-xl px-3.5 py-3 text-sm text-[#172b4d] placeholder-slate-400 outline-none transition-all shadow-xs"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setAppliedQuery('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1 py-0.5"
            >
              Clear
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="bg-[#2474e8] hover:bg-[#1c62cb] active:scale-[0.98] text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer shrink-0"
        >
          Search
        </button>
      </div>

      {/* Section Header */}
      <div className="pt-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-[#172b4d]">
          {cleanApplied ? `Search Results (${matchedCustomers.length})` : 'Recent Customers'}
        </h2>
        {cleanApplied && (
          <button
            onClick={() => {
              setQuery('');
              setAppliedQuery('');
            }}
            className="text-xs text-[#2474e8] font-semibold hover:underline"
          >
            Show All
          </button>
        )}
      </div>

      {/* Customers List */}
      <div className="space-y-2.5">
        {matchedCustomers.length > 0 ? (
          matchedCustomers.map((customer) => {
            const custFacilities = facilities.filter((f) => f.customerId === customer.id);
            const totalArrears = custFacilities.reduce((sum, f) => sum + (f.arrears || 0), 0);

            return (
              <div
                key={customer.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  playKeyClick();
                  onSelectCustomer(customer);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    playKeyClick();
                    onSelectCustomer(customer);
                  }
                }}
                className="w-full text-left bg-white border border-[#e3eaf4] hover:border-[#b9cce6] hover:shadow-md active:bg-[#f8fbff] rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[#2474e8]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#e9f2ff] text-[#2474e8] flex items-center justify-center font-extrabold text-base shrink-0 shadow-xs">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[15px] text-[#172b4d] truncate">
                      {customer.name}
                    </div>
                    <div className="text-xs text-[#7183a3] truncate mt-0.5 flex items-center gap-1.5">
                      <span>{customer.id}</span>
                      <span>·</span>
                      <span>{customer.phone}</span>
                    </div>
                    <div className="text-[11px] font-medium mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-[#2474e8]">
                        {custFacilities.length} active loan{custFacilities.length === 1 ? '' : 's'}
                      </span>
                      {totalArrears > 0 && (
                        <span className="text-[10px] font-bold text-[#e34854] bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                          Arrears: {formatMoney(totalArrears)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-[#2474e8] text-xl font-bold shrink-0 pr-1">
                  <ChevronRight size={20} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-[#e3eaf4] rounded-2xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <SearchIcon size={22} />
            </div>
            <h3 className="text-base font-bold text-[#172b4d] mb-1">No customers found</h3>
            <p className="text-xs text-[#7183a3] max-w-xs mx-auto">
              No borrower or facility matched &quot;{appliedQuery}&quot;. Try searching by NIC (e.g. 200012345678), loan number (e.g. E26-10-02ACPL), or full name.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
