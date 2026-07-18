"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const school_slug = formData.get("school_slug") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await signIn("credentials", {
        school_slug,
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid login credentials. Please double-check your school ID, email, and password.");
        setIsLoading(false);
      } else {
        // Router refresh and redirect is handled by middleware, but we can proactively push
        router.refresh();
        router.push("/dashboard"); 
        // We push to /dashboard and let middleware redirect to /dashboard/overview or /dashboard/feed based on role
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again later.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left side - Brand Panel (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black flex-col justify-center items-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0 opacity-20 animate-pulse-subtle">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--color-primary)] blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--color-primary-dark)] blur-[120px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center text-white px-12 animate-float">
          <h1 className="text-6xl font-bold tracking-tight mb-4">SEH Hub</h1>
          <p className="text-xl font-medium text-gray-300">Connecting Schools and Homes</p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex flex-1 flex-col justify-center items-center px-6 py-12 lg:px-16 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo only visible when left panel is hidden */}
          <div className="lg:hidden text-center mb-10">
            <h1 className="text-4xl font-bold tracking-tight text-black mb-2">SEH Hub</h1>
            <p className="text-gray-500 font-medium">Connecting Schools and Homes</p>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-8">Welcome back</h2>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                id="school_slug"
                name="school_slug"
                type="text"
                required
                className="input-floating peer"
                placeholder=" "
              />
              <label htmlFor="school_slug" className="label-floating">
                School ID
              </label>
            </div>

            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-floating peer"
                placeholder=" "
              />
              <label htmlFor="email" className="label-floating">
                Email Address
              </label>
            </div>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="input-floating peer"
                placeholder=" "
              />
              <label htmlFor="password" className="label-floating">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.29-3.29" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-black bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
