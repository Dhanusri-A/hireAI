"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CandidateJobCard from "../components/CandidateJobCard";
import { Search, SlidersHorizontal, X } from "lucide-react";

const mockJobs = [
  {
    jobId: "j1",
    companyName: "TechBit Solutions",
    role: "Frontend Developer",
    jobType: "Full-time",
    industry: "Information Technology",
    jobDescription:
      "Building modern React applications with Next.js and Tailwind. Great team culture and learning opportunities.",
    salaryRange: [800000, 1400000],
    addressCity: "Coimbatore",
    addressState: "Tamil Nadu",
    location: "Coimbatore, Tamil Nadu",
    postedMethod: "private",
    requirements: ["React", "TypeScript", "Tailwind CSS", "Git"],
  },
  {
    jobId: "j2",
    companyName: "GreenFuture Energy",
    role: "Solar Design Engineer",
    jobType: "Contract",
    industry: "Renewable Energy",
    jobDescription:
      "Design and optimize solar power plants. Work with latest PV technology and simulation tools.",
    salaryRange: [600000, 1100000],
    addressCity: "Tiruppur",
    addressState: "Tamil Nadu",
    location: "Tiruppur, Tamil Nadu",
    postedMethod: "public",
    requirements: ["AutoCAD", "PVsyst", "Electrical Engineering background"],
  },
  {
    jobId: "j3",
    companyName: "EduSmart Academy",
    role: "Content Writer (Technical)",
    jobType: "Part-time",
    industry: "Education",
    jobDescription:
      "Create engaging technical blog posts, tutorials and course content for programming students.",
    salaryRange: [300000, 600000],
    addressCity: "Chennai",
    addressState: "Tamil Nadu",
    location: "Chennai, Tamil Nadu",
    postedMethod: "private",
    requirements: ["Technical writing", "SEO basics", "Programming knowledge"],
  },
];

export default function Jobs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    jobType: "",
    industry: "",
    postedMethod: "",
  });

  const allJobs = mockJobs;

  const filteredJobs = allJobs.filter((job) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      job.companyName?.toLowerCase().includes(q) ||
      job.role?.toLowerCase().includes(q) ||
      job.jobDescription?.toLowerCase().includes(q) ||
      job.addressCity?.toLowerCase().includes(q);

    const matchesType = !filters.jobType || job.jobType === filters.jobType;
    const matchesInd = !filters.industry || job.industry === filters.industry;
    const matchesMethod =
      !filters.postedMethod || job.postedMethod === filters.postedMethod;

    return matchesSearch && matchesType && matchesInd && matchesMethod;
  });

  const industries = [...new Set(allJobs.map((j) => j.industry).filter(Boolean))];

  const activeFiltersCount = [
    filters.jobType,
    filters.industry,
    filters.postedMethod,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({ jobType: "", industry: "", postedMethod: "" });
    setSearchTerm("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-black tracking-tight">
          Find Your Next Opportunity
        </h1>
        <p className="text-gray-400">
          Discover jobs that match your skills and goals
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs, companies, locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#1A2342] border border-[#2A3A5A] rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2B7FFF] focus:border-transparent transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
            filterOpen || activeFiltersCount > 0
              ? "bg-gradient-to-r from-[#2B7FFF] to-[#1E90FF] text-white shadow-lg shadow-[#2B7FFF]/25"
              : "bg-[#1A2342] border border-[#2A3A5A] text-gray-300 hover:bg-[#1E2A4A]"
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="hidden sm:inline">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="ml-1 w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {filterOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-[#151B35] border border-[#1E2A4A] rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-[#10B981] hover:text-[#14F195] font-medium transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Job Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Job Type
                  </label>
                  <select
                    value={filters.jobType}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, jobType: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 bg-[#1A2342] border border-[#2A3A5A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#2B7FFF] focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>

                {/* Industry */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Industry
                  </label>
                  <select
                    value={filters.industry}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, industry: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 bg-[#1A2342] border border-[#2A3A5A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#2B7FFF] focus:border-transparent"
                  >
                    <option value="">All Industries</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Source */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Job Source
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          postedMethod: prev.postedMethod === "public" ? "" : "public",
                        }))
                      }
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        filters.postedMethod === "public"
                          ? "bg-gradient-to-r from-[#2B7FFF] to-[#1E90FF] text-white"
                          : "bg-[#1A2342] border border-[#2A3A5A] text-gray-300 hover:bg-[#1E2A4A]"
                      }`}
                    >
                      Open Jobs
                    </button>
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          postedMethod: prev.postedMethod === "private" ? "" : "private",
                        }))
                      }
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        filters.postedMethod === "private"
                          ? "bg-gradient-to-r from-[#2B7FFF] to-[#1E90FF] text-white"
                          : "bg-[#1A2342] border border-[#2A3A5A] text-gray-300 hover:bg-[#1E2A4A]"
                      }`}
                    >
                      Company Jobs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Showing <span className="font-semibold text-white">{filteredJobs.length}</span> jobs
        </p>
      </div>

      {/* Job Cards Grid */}
      <div className="grid gap-4 md:gap-6">
        {filteredJobs.map((job, i) => (
          <motion.div
            key={job.jobId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <CandidateJobCard job={job} index={i} />
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredJobs.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-[#151B35] rounded-2xl border border-[#1E2A4A]"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-[#1A2342] rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No jobs found
          </h3>
          <p className="text-gray-400 mb-4">
            Try adjusting your search or filter criteria
          </p>
          <button
            onClick={clearFilters}
            className="px-6 py-2.5 bg-gradient-to-r from-[#2B7FFF] to-[#1E90FF] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#2B7FFF]/25 transition-all"
          >
            Clear filters
          </button>
        </motion.div>
      )}
    </div>
  );
}