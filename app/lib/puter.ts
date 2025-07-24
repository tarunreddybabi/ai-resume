import { create } from "zustand";

declare global {
  interface Window {
    puter: {
      auth: {
        getUser: () => Promise<PuterUser>;
        isSignedIn: () => Promise<boolean>;
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
      };
      fs: {
        write: (
          path: string,
          data: string | File | Blob
        ) => Promise<File | undefined>;
        read: (path: string) => Promise<Blob>;
        upload: (file: File[] | Blob[]) => Promise<FSItem>;
        delete: (path: string) => Promise<void>;
        readdir: (path: string) => Promise<FSItem[] | undefined>;
      };
      ai: {
        chat: (
          prompt: string | ChatMessage[],
          imageURL?: string | PuterChatOptions,
          testMode?: boolean,
          options?: PuterChatOptions
        ) => Promise<Object>;
        img2txt: (
          image: string | File | Blob,
          testMode?: boolean
        ) => Promise<string>;
      };
      kv: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
        list: (pattern: string, returnValues?: boolean) => Promise<string[]>;
        flush: () => Promise<boolean>;
      };
    };
  }
}

interface GenerateResumeOptions {
  originalResume: string;
  jobDescription: string;
  companyName?: string;
  feedback: Feedback;
  additionalInstructions?: string;
}

interface GeneratedResumeResult {
  success: boolean;
  updatedResumeContent?: string;
  savedPath?: string;
  error?: string;
}

interface PuterStore {
  isLoading: boolean;
  error: string | null;
  puterReady: boolean;
  auth: {
    user: PuterUser | null;
    isAuthenticated: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    checkAuthStatus: () => Promise<boolean>;
    getUser: () => PuterUser | null;
  };
  fs: {
    write: (
      path: string,
      data: string | File | Blob
    ) => Promise<File | undefined>;
    read: (path: string) => Promise<Blob | undefined>;
    upload: (file: File[] | Blob[]) => Promise<FSItem | undefined>;
    delete: (path: string) => Promise<void>;
    readDir: (path: string) => Promise<FSItem[] | undefined>;
  };
  ai: {
    chat: (
      prompt: string | ChatMessage[],
      imageURL?: string | PuterChatOptions,
      testMode?: boolean,
      options?: PuterChatOptions
    ) => Promise<AIResponse | undefined>;
    feedback: (
      path: string,
      message: string
    ) => Promise<AIResponse | undefined>;
    generateUpdatedResume: (
      options: GenerateResumeOptions
    ) => Promise<GeneratedResumeResult>;
    img2txt: (
      image: string | File | Blob,
      testMode?: boolean
    ) => Promise<string | undefined>;
  };
  kv: {
    get: (key: string) => Promise<string | null | undefined>;
    set: (key: string, value: string) => Promise<boolean | undefined>;
    delete: (key: string) => Promise<boolean | undefined>;
    list: (
      pattern: string,
      returnValues?: boolean
    ) => Promise<string[] | KVItem[] | undefined>;
    flush: () => Promise<boolean | undefined>;
  };

  init: () => void;
  clearError: () => void;
}

const getPuter = (): typeof window.puter | null =>
  typeof window !== "undefined" && window.puter ? window.puter : null;

export const usePuterStore = create<PuterStore>((set, get) => {
  const setError = (msg: string) => {
    set({
      error: msg,
      isLoading: false,
      auth: {
        user: null,
        isAuthenticated: false,
        signIn: get().auth.signIn,
        signOut: get().auth.signOut,
        refreshUser: get().auth.refreshUser,
        checkAuthStatus: get().auth.checkAuthStatus,
        getUser: get().auth.getUser,
      },
    });
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const isSignedIn = await puter.auth.isSignedIn();
      if (isSignedIn) {
        const user = await puter.auth.getUser();
        set({
          auth: {
            user,
            isAuthenticated: true,
            signIn: get().auth.signIn,
            signOut: get().auth.signOut,
            refreshUser: get().auth.refreshUser,
            checkAuthStatus: get().auth.checkAuthStatus,
            getUser: () => user,
          },
          isLoading: false,
        });
        return true;
      } else {
        set({
          auth: {
            user: null,
            isAuthenticated: false,
            signIn: get().auth.signIn,
            signOut: get().auth.signOut,
            refreshUser: get().auth.refreshUser,
            checkAuthStatus: get().auth.checkAuthStatus,
            getUser: () => null,
          },
          isLoading: false,
        });
        return false;
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to check auth status";
      setError(msg);
      return false;
    }
  };

  const signIn = async (): Promise<void> => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }

    set({ isLoading: true, error: null });

    try {
      await puter.auth.signIn();
      await checkAuthStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setError(msg);
    }
  };

  const signOut = async (): Promise<void> => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }

    set({ isLoading: true, error: null });

    try {
      await puter.auth.signOut();
      set({
        auth: {
          user: null,
          isAuthenticated: false,
          signIn: get().auth.signIn,
          signOut: get().auth.signOut,
          refreshUser: get().auth.refreshUser,
          checkAuthStatus: get().auth.checkAuthStatus,
          getUser: () => null,
        },
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign out failed";
      setError(msg);
    }
  };

  const refreshUser = async (): Promise<void> => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const user = await puter.auth.getUser();
      set({
        auth: {
          user,
          isAuthenticated: true,
          signIn: get().auth.signIn,
          signOut: get().auth.signOut,
          refreshUser: get().auth.refreshUser,
          checkAuthStatus: get().auth.checkAuthStatus,
          getUser: () => user,
        },
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to refresh user";
      setError(msg);
    }
  };

  const init = (): void => {
    const puter = getPuter();
    if (puter) {
      set({ puterReady: true });
      checkAuthStatus();
      return;
    }

    const interval = setInterval(() => {
      if (getPuter()) {
        clearInterval(interval);
        set({ puterReady: true });
        checkAuthStatus();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      if (!getPuter()) {
        setError("Puter.js failed to load within 10 seconds");
      }
    }, 10000);
  };

  const write = async (path: string, data: string | File | Blob) => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    return puter.fs.write(path, data);
  };

  const readDir = async (path: string) => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    return puter.fs.readdir(path);
  };

  const readFile = async (path: string) => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    return puter.fs.read(path);
  };

  const upload = async (files: File[] | Blob[]) => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    return puter.fs.upload(files);
  };

  const deleteFile = async (path: string) => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    return puter.fs.delete(path);
  };

  const chat = async (
    prompt: string | ChatMessage[],
    imageURL?: string | PuterChatOptions,
    testMode?: boolean,
    options?: PuterChatOptions
  ) => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    return puter.ai.chat(prompt, imageURL, testMode, options) as Promise<
      AIResponse | undefined
    >;
  };

  const feedback = async (path: string, message: string) => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }

    return puter.ai.chat(
      [
        {
          role: "user",
          content: [
            {
              type: "file",
              puter_path: path,
            },
            {
              type: "text",
              text: message,
            },
          ],
        },
      ],
      { model: "claude-3-7-sonnet" }
    ) as Promise<AIResponse | undefined>;
  };

  const generateUpdatedResume = async (
    options: GenerateResumeOptions
  ): Promise<GeneratedResumeResult> => {
    const puter = getPuter();
    if (!puter) {
      return {
        success: false,
        error: "Puter.js not available",
      };
    }

    try {
      const {
        originalResume,
        jobDescription,
        companyName,
        feedback,
        additionalInstructions,
      } = options;

      const resumePrompt = 
        `**Role:** Professional resume writer and formatter
        **Objective:** Given a user's original resume text, job description, company name, and feedback, generate a fully reformatted and revised resume text only, strictly in a clean resume format that can be inserted into PDF or Word document generation logic.

        **Original Resume:**
        ${originalResume}

        **Job Description:**
        ${jobDescription}

        **Company:** ${companyName || "Not specified"}
        DETAILED FEEDBACK ANALYSIS:**
        - Overall Score: ${feedback.overallScore ?? "Not provided"}
        - ATS Score: ${feedback.ATS?.score ?? "Not provided"}/100
        - ATS Tips: ${JSON.stringify(feedback.ATS?.tips ?? [], null, 2)}
        - Tone & Style Score: ${feedback.toneAndStyle?.score ?? "Not provided"}
        - Tone & Style Tips: ${JSON.stringify(
                feedback.toneAndStyle?.tips ?? [],
                null,
                2
              )}
        - Content Score: ${feedback.content?.score ?? "Not provided"}
        - Content Tips: ${JSON.stringify(feedback.content?.tips ?? [], null, 2)}
        - Structure Score: ${feedback.structure?.score ?? "Not provided"}
        - Structure Tips: ${JSON.stringify(feedback.structure?.tips ?? [], null, 2)}
        - Skills Score: ${feedback.skills?.score ?? "Not provided"}
        - Skills Tips: ${JSON.stringify(feedback.skills?.tips ?? [], null, 2)}

        **Additional Instructions:** ${
                additionalInstructions ||
                "Focus on ATS optimization, keyword integration, and professional formatting"
              }

        **Instructions:**
        1. Using the original resume and feedback, improve and rewrite the resume content to better align with the job description.
        2. **Do not** include any prompt texts, system messages, explanations, or comments. Only output the resume content.
        3. Keep the same structure, section order, and style typically found in resumes (e.g., Contact Info, Summary, Work Experience, Education, Skills).
        4. Output this content so it can be directly used to generate a PDF or Word document.
        5. Use bullet points with • symbol for experience items
        6. Ensure proper spacing and formatting for professional appearance
        7. Include quantified achievements where possible
        8. Naturally integrate relevant keywords from job description
        9. Maintain 1-2 page length appropriately

        **Output:** Plain text representing the full updated resume content only.`;

      const aiResponse = (await puter.ai.chat(resumePrompt, {
        model: "claude-3-7-sonnet",
        max_tokens: 4000,
        temperature: 0.2
      })) as AIResponse;

      if (!aiResponse || !aiResponse.message?.content) {
        throw new Error("Failed to generate resume content from AI");
      }

      let updatedResumeContent =
        typeof aiResponse.message.content === "string"
          ? aiResponse.message.content
          : aiResponse.message.content[0]?.text || "";

      if (!updatedResumeContent.trim()) {
        throw new Error("Generated resume content is empty");
      }

      updatedResumeContent = cleanResumeOutput(updatedResumeContent);

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `updated_resume_${
        companyName?.replace(/[^a-zA-Z0-9]/g, "_") || "optimized"
      }_${timestamp}.txt`;
      const filepath = `/resumes/updated/${filename}`;

      try {
        await puter.fs.write(filepath, updatedResumeContent);
      } catch (fsError) {
        console.warn("Failed to save updated resume to filesystem:", fsError);
      }

      return {
        success: true,
        updatedResumeContent,
        savedPath: filepath,
      };
    } catch (error) {
      console.error("Error generating updated resume:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  };

  const cleanResumeOutput = (content: string): string => {
    const lines = content.split("\n");
    const cleanedLines = lines.filter((line) => {
      const trimmed = line.trim().toLowerCase();
      if (
        trimmed.startsWith("here is") ||
        trimmed.startsWith("this is") ||
        trimmed.startsWith("the updated") ||
        trimmed.startsWith("based on") ||
        trimmed.includes("i have") ||
        trimmed.includes("as requested") ||
        trimmed.includes("hope this helps")
      ) {
        return false;
      }
      return true;
    });

    return cleanedLines.join("\n").trim();
  };

  const img2txt = async (image: string | File | Blob, testMode?: boolean) => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    return puter.ai.img2txt(image, testMode);
  };

  const getKV = async (key: string) => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    return puter.kv.get(key);
  };

  const setKV = async (key: string, value: string) => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    return puter.kv.set(key, value);
  };

  const deleteKV = async (key: string) => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    return puter.kv.delete(key);
  };

  const listKV = async (pattern: string, returnValues?: boolean) => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    if (returnValues === undefined) {
      returnValues = false;
    }
    return puter.kv.list(pattern, returnValues);
  };

  const flushKV = async () => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    return puter.kv.flush();
  };

  return {
    isLoading: true,
    error: null,
    puterReady: false,
    auth: {
      user: null,
      isAuthenticated: false,
      signIn,
      signOut,
      refreshUser,
      checkAuthStatus,
      getUser: () => get().auth.user,
    },
    fs: {
      write: (path: string, data: string | File | Blob) => write(path, data),
      read: (path: string) => readFile(path),
      readDir: (path: string) => readDir(path),
      upload: (files: File[] | Blob[]) => upload(files),
      delete: (path: string) => deleteFile(path),
    },
    ai: {
      chat: (
        prompt: string | ChatMessage[],
        imageURL?: string | PuterChatOptions,
        testMode?: boolean,
        options?: PuterChatOptions
      ) => chat(prompt, imageURL, testMode, options),
      feedback: (path: string, message: string) => feedback(path, message),
      generateUpdatedResume: (options: GenerateResumeOptions) =>
        generateUpdatedResume(options),
      img2txt: (image: string | File | Blob, testMode?: boolean) =>
        img2txt(image, testMode),
    },
    kv: {
      get: (key: string) => getKV(key),
      set: (key: string, value: string) => setKV(key, value),
      delete: (key: string) => deleteKV(key),
      list: (pattern: string, returnValues?: boolean) =>
        listKV(pattern, returnValues),
      flush: () => flushKV(),
    },
    init,
    clearError: () => set({ error: null }),
  };
});
