import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import { usePuterStore } from "~/lib/puter";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { resumes } from "../../constants";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "LakshyaMargam" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const {  auth } = usePuterStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isAuthenticated) navigate("/auth?next=/");
  }, [auth.isAuthenticated]);
  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Track Your Applications & Resume Ratings</h1>
          <h2>Review your submissions and check AI-powered feedback.</h2>
        </div>
      </section>

      {resumes.length > 0 && (
        <div className="resumes-section">
          {resumes.map((resume: any) => (
            <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      )}

      <div className="flex flex-col items-center justify-center mt-10 gap-4">
        <Link
          to="/upload"
          className="primary-button w-fit text-xl font-semibold"
        >
          Upload Resume
        </Link>
      </div>
    </main>
  );
}
