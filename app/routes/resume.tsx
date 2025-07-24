import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import { ResumeFileGenerator } from "~/lib/fileGenerator";

export const meta = () => [
  { title: "LakshyaMargam | Review " },
  { name: "description", content: "Detailed overview of your resume" },
];

const Resume = () => {
  const { auth, isLoading, fs, kv, ai } = usePuterStore();
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(
    null
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate(`/auth?next=/resume/${id}`);
    }
  }, [isLoading, auth, id, navigate]);

  useEffect(() => {
    const loadResume = async () => {
      try {
        const resume = await kv.get(`resume:${id}`);
        if (!resume) return;

        const data = JSON.parse(resume);

        const resumeBlob = await fs.read(data.resumePath);
        if (resumeBlob) {
          const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
          const resumeUrl = URL.createObjectURL(pdfBlob);
          setResumeUrl(resumeUrl);
        }

        const imageBlob = await fs.read(data.imagePath);
        if (imageBlob) {
          const imageUrl = URL.createObjectURL(imageBlob);
          setImageUrl(imageUrl);
        }

        if (data.fileMetadata) {
          setFileMetadata(data.fileMetadata);
        } else {
          setFileMetadata({
            originalMimeType: "application/pdf",
            originalExtension: "pdf",
            originalFilename: "resume.pdf",
          });
        }

        setFeedback(data.feedback);
      } catch (error) {
        console.error("Error loading resume:", error);
      }
    };

    if (id) {
      loadResume();
    }
  }, [id, kv, fs]);

  const handleGenerateUpdatedResume = async () => {
    if (!feedback) {
      setGenerationError("No feedback available to generate updated resume");
      return;
    }

    if (!fileMetadata) {
      setGenerationError("File metadata not available");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(null);

    try {
      const resume = await kv.get(`resume:${id}`);
      if (!resume) throw new Error("Resume data not found");

      const data = JSON.parse(resume);

      const result = await ai.generateUpdatedResume({
        originalResume: data.rawText,
        jobDescription: data.jd,
        companyName: data.companyName,
        feedback: feedback,
        additionalInstructions:
          "Focus on ATS optimization, keyword matching, and professional formatting. Ensure the resume is tailored specifically for this role.",
      });

      if (result.success && result.updatedResumeContent) {
        ResumeFileGenerator.createPreviewWindow(
          result.updatedResumeContent,
          data.companyName
        );

        await ResumeFileGenerator.generateAndDownload({
          resumeContent: result.updatedResumeContent,
          companyName: data.companyName,
          fileMetadata: fileMetadata,
        });

        setGenerationSuccess(
          `✅ Updated resume generated successfully in ${fileMetadata.originalExtension.toUpperCase()} format! ${
            result.savedPath ? `Also saved to: ${result.savedPath}` : ""
          }`
        );
      } else {
        throw new Error(result.error || "Failed to generate updated resume");
      }
    } catch (error) {
      console.error("Error generating updated resume:", error);
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Failed to generate updated resume"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (resumeUrl) URL.revokeObjectURL(resumeUrl);
    };
  }, [imageUrl, resumeUrl]);

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">
            Back to Homepage
          </span>
        </Link>
      </nav>

      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
          {imageUrl && resumeUrl && (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
              <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={imageUrl}
                  className="w-full h-full object-contain rounded-2xl"
                  title="resume"
                  alt="Resume preview"
                />
              </a>
            </div>
          )}
        </section>

        <section className="feedback-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-4xl !text-black font-bold">Resume Review</h2>

            {feedback && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleGenerateUpdatedResume}
                  disabled={isGenerating}
                  className={`primary-button flex items-center gap-2 ${
                    isGenerating
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-blue-600"
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating with AI...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Generate Updated Resume</span>
                    </>
                  )}
                </button>

                {generationError && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                    <strong>❌ Error:</strong> {generationError}
                  </div>
                )}

                {generationSuccess && (
                  <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                    <strong>✅ Success:</strong> {generationSuccess}
                  </div>
                )}
              </div>
            )}
          </div>

          {feedback ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
              <Summary feedback={feedback} />
              <ATS
                score={feedback.ATS?.score || 0}
                suggestions={feedback.ATS?.tips || []}
              />
              <Details feedback={feedback} />

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <span>🎯</span>
                  <span>AI-Powered Resume Optimization</span>
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      ✨ What Gets Improved:
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• ATS compatibility optimization</li>
                      <li>• Strategic keyword integration</li>
                      <li>• Professional formatting enhancement</li>
                      <li>• Achievement quantification</li>
                      <li>• Industry-specific terminology</li>
                    </ul>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      🎯 Based on Your Feedback:
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>
                        • Current ATS Score: {feedback.ATS?.score || 0}/100
                      </li>
                      <li>• Overall Score: {feedback.overallScore || 0}/100</li>
                      <li>
                        • Tone & Style Score:{" "}
                        {feedback.toneAndStyle?.score || 0}/100
                      </li>
                      <li>
                        • Content Score: {feedback.content?.score || 0}/100
                      </li>
                      <li>
                        • Structure Score: {feedback.structure?.score || 0}/100
                      </li>
                      <li>• Skills Score: {feedback.skills?.score || 0}/100</li>
                      <li>
                        • Suggestions Applied: {feedback.ATS?.tips?.length || 0}
                      </li>
                      <li>• Target: 85%+ ATS compatibility</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 Pro Tip:</strong> The AI will create a tailored
                    version specifically for this role, incorporating feedback
                    insights and job requirements for maximum impact.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <img
                src="/images/resume-scan-2.gif"
                className="w-full max-w-md mx-auto"
                alt="Scanning resume"
              />
              <p className="text-gray-600 mt-4">
                Analyzing your resume with AI...
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default Resume;
