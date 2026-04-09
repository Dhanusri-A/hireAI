// src/steps/Step1Basics.jsx
import React, { useRef } from "react";
import { Upload, X, Camera } from "lucide-react";

export default function Step1Basics({ formData, updateFormData }) {
  const fileInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Validate type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      updateFormData("profilePhoto", { file, preview: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => updateFormData("profilePhoto", null);

  // Fallback avatar — first letter of firstName (or "?" if not yet filled)
  const initials = (formData.firstName?.[0] || "?").toUpperCase();

  const countries = [
    { code: "+1",   name: "USA/Canada"    },
    { code: "+44",  name: "UK"            },
    { code: "+91",  name: "India"         },
    { code: "+65",  name: "Singapore"     },
    { code: "+31",  name: "Netherlands"   },
    { code: "+49",  name: "Germany"       },
    { code: "+33",  name: "France"        },
    { code: "+61",  name: "Australia"     },
    { code: "+81",  name: "Japan"         },
    { code: "+86",  name: "China"         },
    { code: "+971", name: "UAE"           },
    { code: "+966", name: "Saudi Arabia"  },
    { code: "+974", name: "Qatar"         },
    { code: "+968", name: "Oman"          },
    { code: "+60",  name: "Malaysia"      },
    { code: "+62",  name: "Indonesia"     },
    { code: "+63",  name: "Philippines"   },
    { code: "+66",  name: "Thailand"      },
    { code: "+82",  name: "South Korea"   },
    { code: "+852", name: "Hong Kong"     },
    { code: "+886", name: "Taiwan"        },
    { code: "+39",  name: "Italy"         },
    { code: "+34",  name: "Spain"         },
    { code: "+46",  name: "Sweden"        },
    { code: "+41",  name: "Switzerland"   },
    { code: "+7",   name: "Russia"        },
    { code: "+55",  name: "Brazil"        },
    { code: "+52",  name: "Mexico"        },
    { code: "+27",  name: "South Africa"  },
    { code: "+234", name: "Nigeria"       },
    { code: "+20",  name: "Egypt"         },
    { code: "+64",  name: "New Zealand"   },
  ];

  return (
    <div className="space-y-10">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          Let's start with the basics
        </h2>
        <p className="text-gray-600">Tell us about yourself to get started</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-8">

        {/* ── Profile Photo ─────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            {formData.profilePhoto?.preview ? (
              /* Photo uploaded — show preview */
              <img
                src={formData.profilePhoto.preview}
                alt="Profile preview"
                className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-emerald-100 shadow-sm"
              />
            ) : (
              /* No photo — show initials fallback */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center cursor-pointer border-4 border-emerald-100 shadow-sm select-none"
                title="Click to upload a photo"
              >
                {formData.firstName ? (
                  <span className="text-4xl font-bold text-white">{initials}</span>
                ) : (
                  <Upload className="w-9 h-9 text-white/80" />
                )}
              </div>
            )}

            {/* Camera icon overlay — always visible on hover */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-8 h-8 bg-white border-2 border-emerald-200 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-50"
              title="Change photo"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
            </button>

            {/* Remove button — only shown when photo is set */}
            {formData.profilePhoto?.preview && (
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                title="Remove photo"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <p className="text-sm text-gray-500">
            {formData.profilePhoto?.preview
              ? "Looking good! Click to change."
              : "Upload a profile photo (optional, max 5 MB)"}
          </p>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {/* ── Names ─────────────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => updateFormData("firstName", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => updateFormData("lastName", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all"
              required
            />
          </div>
        </div>

        {/* ── Headline ──────────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Professional Headline / Current Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.headline}
            onChange={(e) => updateFormData("headline", e.target.value)}
            placeholder="e.g., Senior Frontend Developer"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all"
            required
          />
        </div>

        {/* ── Email & Phone ─────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Primary Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData("email", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Primary Phone <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <select
                value={formData.phoneCountryCode || "+91"}
                onChange={(e) => updateFormData("phoneCountryCode", e.target.value)}
                className="px-3 py-3 border border-r-0 border-gray-200 bg-gray-50 rounded-l-xl text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData("phone", e.target.value)}
                placeholder="Enter phone number"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-r-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all"
                required
              />
            </div>
          </div>
        </div>

        {/* ── Location ──────────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => updateFormData("location", e.target.value)}
            placeholder="City, State/Province, Country"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all"
            required
          />
        </div>
      </div>
    </div>
  );
}