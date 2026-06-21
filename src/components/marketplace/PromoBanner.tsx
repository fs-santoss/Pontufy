interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
}

export default function PromoBanner({ banners }: { banners: Banner[] }) {
  // Limite Estrito de Banners (Max 3) garantido nativamente
  const displayBanners = banners.slice(0, 3);

  return (
    <div className="w-full mb-12">
      <h2 className="text-xl font-bold text-brand-slate mb-6 px-8 md:px-16">Destaques do Clube</h2>
      <div className="flex gap-6 overflow-x-auto hide-scrollbar px-8 md:px-16 pb-4 -mx-4">
        {displayBanners.map((banner) => (
          <div 
            key={banner.id} 
            className="flex-none w-[300px] md:w-[450px] h-[200px] rounded-xl overflow-hidden relative group cursor-pointer shadow-sm border border-gray-100"
          >
            <img 
              src={banner.imageUrl} 
              alt={banner.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-slate/90 via-brand-slate/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-6 w-full">
              <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{banner.title}</h3>
              <p className="text-gray-200 text-sm font-medium leading-tight">{banner.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
