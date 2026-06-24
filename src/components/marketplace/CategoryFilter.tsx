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
    <div className="flex gap-2 overflow-x-auto hide-scrollbar px-8 md:px-16 mb-8 py-1">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`flex-none px-5 py-2 rounded-full font-semibold text-sm transition-all border ${
            activeCategory === cat.id
              ? 'bg-white text-black border-white'
              : 'bg-[#1f1f1f] text-gray-400 border-[#2a2a2a] hover:border-[#3a3a3a] hover:text-white'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
