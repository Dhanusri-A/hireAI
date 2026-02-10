"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Briefcase,
  MapPin,
  Building2,
  Layers,
  Clock,
  ChevronRight,
  PlusCircle,
  Search,
  Trash2,
  X,
  Pencil,
} from "lucide-react";
import { getAllJobs, deleteJobDescription } from "../../../api/api";

const LIMIT = 5;

export default function MyJobs() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [deleteJob, setDeleteJob] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await getAllJobs({ skip, limit: LIMIT });
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [skip]);

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();

    return jobs.filter((job) =>
      [
        job.job_title,
        job.company_name,
        job.location,
        job.department,
        job.skills,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [jobs, search]);

  const handleDelete = async () => {
    if (!deleteJob) return;

    setDeleting(true);
    try {
      await deleteJobDescription(deleteJob.id);
      setJobs((prev) => prev.filter((j) => j.id !== deleteJob.id));
      setDeleteJob(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-8 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Job Listings</h1>
            <p className="text-emerald-100">
              Search, manage and track your job posts
            </p>
          </div>

          <Link
            to="/recruiter/generate-jd"
            className="flex items-center gap-2 bg-white text-emerald-700 px-5 py-3 rounded-xl font-semibold shadow-lg"
          >
            <PlusCircle className="w-5 h-5" />
            Post New Job
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="sticky top-4 z-20">
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs by title, company, skills, location…"
            className="w-full bg-transparent outline-none text-slate-700"
          />
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {filteredJobs.map((job, index) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="relative bg-white border-2 border-slate-200 rounded-2xl p-6 hover:shadow-lg transition"
          >
            {/* Actions */}
            <div className="absolute top-4 right-4 flex gap-1 z-10">
              {/* Edit */}
              <button
                type="button"
                onClick={() => navigate(`/recruiter/my-jobs/edit/${job.id}`, { state: job })}
                className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                title="Edit job"
              >
                <Pencil className="w-4 h-4" />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => setDeleteJob(job)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                title="Delete job"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Clickable content */}
            <div
              onClick={() =>
                navigate(`/recruiter/my-jobs/${job.id}`, { state: job })
              }
              className="cursor-pointer"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {job.job_title}
              </h3>

              <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-2">
                <Meta icon={<Building2 />} label={job.company_name} />
                <Meta icon={<MapPin />} label={job.location} />
                <Meta icon={<Layers />} label={job.level} />
                <Meta icon={<Clock />} label={job.department} />
              </div>

              <p className="text-sm text-slate-600 line-clamp-2">
                {job.input_description}
              </p>

              <ChevronRight className="absolute bottom-4 right-6 w-5 h-5 text-slate-400" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete Modal */}
      {deleteJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">Delete Job?</h3>
            <p className="text-slate-600 mb-6">
              This will permanently delete{" "}
              <span className="font-semibold">{deleteJob.job_title}</span>.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteJob(null)}
                className="px-4 py-2 rounded-xl border"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-red-600 text-white font-semibold"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Helpers */

const Meta = ({ icon, label }) => (
  <span className="flex items-center gap-1">
    <span className="text-slate-400">{icon}</span>
    {label}
  </span>
);
