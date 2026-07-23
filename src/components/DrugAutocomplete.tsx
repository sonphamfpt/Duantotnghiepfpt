import React, { useEffect, useRef, useState } from "react";
import { Icon } from './Icon';

export type Drug = {
  id: string;
  name: string;
  type?: string;
};

type Props = {
  availableDrugs: Drug[];
  onAddDrug: (id: string) => void;
  onAddCustomDrug: (name: string) => void;
  placeholder?: string;
  maxResults?: number;
};

export default function DrugAutocomplete({
  availableDrugs,
  onAddDrug,
  onAddCustomDrug,
  placeholder = "-- Chọn thuốc trong danh mục --",
  maxResults = 20,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Drug[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q === "") {
      setResults(availableDrugs.slice(0, maxResults));
    } else {
      const filtered = availableDrugs.filter((d) => {
        return (
          d.name.toLowerCase().includes(q) ||
          (!!d.type && d.type.toLowerCase().includes(q))
        );
      });
      setResults(filtered.slice(0, maxResults));
    }
  }, [query, availableDrugs, maxResults]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectDrug(d: Drug) {
    onAddDrug(d.id);
    setQuery("");
    setOpen(false);
  }

  function handleAddNew() {
    const name = query.trim();
    if (name === "") return;
    onAddCustomDrug(name);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full bg-surface-container border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
      />

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {results.length > 0 ? (
            <ul role="listbox" className="divide-y divide-gray-100">
              {results.map((d) => (
                <li
                  key={d.id}
                  role="option"
                  onClick={() => handleSelectDrug(d)}
                  className="cursor-pointer px-3 py-2 hover:bg-gray-100 flex justify-between items-center text-xs"
                >
                  <div className="text-sm text-gray-800">
                    {d.name}
                    {d.type ? (
                      <span className="text-xs text-gray-500 ml-2">({d.type})</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2">
              <button
                onClick={handleAddNew}
                className="w-full text-left text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
              >
                <Icon name="add" className="text-[18px]" />
                <span>Thêm thuốc mới: <span className="font-medium">{query}</span></span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
