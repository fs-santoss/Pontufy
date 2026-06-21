interface Category {
  id: string;
  name: string;
}

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  onSelect: (id: string) => void;
}

export default function CategoryFilter({ categories, activeCategory, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-3 overflow-x-auto hide-scrollbar px-8 md:px-16 mb-8 py-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`flex-none px-6 py-2 rounded-full font-bold text-sm transition-all shadow-sm
            ${activeCategory === cat.id 
              ? 'bg-brand-slate text-white shadow-md' 
              : 'bg-white text-brand-text border border-gray-200 hover:border-gray-300 hover:text-brand-slate'
            }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
