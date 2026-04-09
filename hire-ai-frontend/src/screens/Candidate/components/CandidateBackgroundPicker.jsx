import { X } from "lucide-react";

const PRESETS = [
  { id: "none",  label: "None",  preview: null },
  { id: "blur",  label: "Blur",  preview: null },
  {
    id: "office",
    label: "Office",
    url: "https://static.vecteezy.com/system/resources/thumbnails/056/114/218/small/shelves-office-background-wall-photo.jpg",
    preview: "https://static.vecteezy.com/system/resources/thumbnails/056/114/218/small/shelves-office-background-wall-photo.jpg",
  },
  {
    id: "library",
    label: "Library",
    url: "https://talkbusiness.net/wp-content/uploads/2022/02/Research-Library-Education-732x384.jpg",
    preview: "https://talkbusiness.net/wp-content/uploads/2022/02/Research-Library-Education-732x384.jpg",
  },
  {
    id: "nature",
    label: "Nature",
    url: "https://img.freepik.com/free-photo/mountain-range-body-water_53876-139760.jpg?semt=ais_incoming&w=740&q=80",
    preview: "https://img.freepik.com/free-photo/mountain-range-body-water_53876-139760.jpg?semt=ais_incoming&w=740&q=80",
  },
  {
    id: "colorful",
    label: "Colorful",
    url: "https://cdn.prod.website-files.com/65130e79c72ae8812db3412e/656fb3bef5e283b1505be59b_65cee7e8a0387a8dfccfae9699bc195c.webp",
    preview: "https://cdn.prod.website-files.com/65130e79c72ae8812db3412e/656fb3bef5e283b1505be59b_65cee7e8a0387a8dfccfae9699bc195c.webp",
  },
  {
    id: "office2",
    label: "Office 2",
    url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmQSGK7v12eAhhvTcyEQs9QacBN0xiG3fKbg&s",
    preview: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmQSGK7v12eAhhvTcyEQs9QacBN0xiG3fKbg&s",
  },
  {
    id: "virtual",
    label: "Virtual",
    url: "https://i.pinimg.com/736x/f3/b2/ac/f3b2acbe62a85a31e164c0679c16eb0c.jpg",
    preview: "https://i.pinimg.com/736x/f3/b2/ac/f3b2acbe62a85a31e164c0679c16eb0c.jpg",
  },
  {
    id: "moon",
    label: "Moon",
    url: "https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L3JtNDk0LWJnLTAzNy14LmpwZw.jpg",
    preview: "https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L3JtNDk0LWJnLTAzNy14LmpwZw.jpg",
  },
  {
    id: "moon",
    label: "Moon",
    url: "https://cdn.mos.cms.futurecdn.net/kgE6tFtqomT4ATULBytsqb.jpg",
    preview: "https://cdn.mos.cms.futurecdn.net/kgE6tFtqomT4ATULBytsqb.jpg",
  },
  {
    id: "fantasy",
    label: "Fantasy",
    url: "https://thumbs.dreamstime.com/b/immersive-green-zoom-background-surreal-fantasy-office-virtual-meetings-creative-collaboration-step-vibrant-350863847.jpg",
    preview: "https://thumbs.dreamstime.com/b/immersive-green-zoom-background-surreal-fantasy-office-virtual-meetings-creative-collaboration-step-vibrant-350863847.jpg",
  },
  {
    id: "Office3",
    label: "Office 3",
    url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6eM4pkb7Ptph50ms4CLwVUdo6IXPEQkBvxA&s",
    preview: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6eM4pkb7Ptph50ms4CLwVUdo6IXPEQkBvxA&s",
  },
];

export default function CandidateBackgroundPicker({ current, onChange, onClose, inline = false }) {
  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-white text-sm font-semibold">Background</span>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((p) => {
          const isActive = current === p.id || (p.url && current === p.url);
          return (
            <button
              key={p.id}
              onClick={() => onChange(p.url || p.id)}
              className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                isActive ? "border-emerald-500" : "border-gray-600 hover:border-gray-400"
              }`}
              style={{ aspectRatio: "16/9" }}
            >
              {p.preview ? (
                <img src={p.preview} alt={p.label} className="w-full h-full object-cover" />
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center text-xs font-medium ${
                    p.id === "blur"
                      ? "bg-gradient-to-br from-gray-600 to-gray-800 text-white"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {p.id === "blur" ? (
                    <span style={{ textShadow: "0 0 8px rgba(255,255,255,0.6)" }}>Blur</span>
                  ) : (
                    "None"
                  )}
                </div>
              )}
              <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] text-white bg-black/50 py-0.5">
                {p.label}
              </span>
              {isActive && (
                <div className="absolute inset-0 border-2 border-emerald-500 rounded-lg pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  if (inline) return <div className="p-4">{content}</div>;

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl p-4 w-72">
      {content}
    </div>
  );
}