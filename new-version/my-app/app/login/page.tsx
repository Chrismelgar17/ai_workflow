		"use client";
		import { useState } from "react";
		import { useRouter } from "next/navigation";
		import Link from "next/link";

		export default function LoginPage() {
			const [email, setEmail] = useState("");
			const [password, setPassword] = useState("");
			const [error, setError] = useState("");
			const [loading, setLoading] = useState(false);
			const router = useRouter();

			async function handleLogin(e: React.FormEvent) {
				e.preventDefault();
				setLoading(true);
				setError("");
				try {
					const res = await fetch("http://localhost:5000/api/auth/login", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ email, password })
					});
					const data = await res.json();
					if (!res.ok) {
						setError(data.error || "Invalid credentials");
					} else if (data.user && data.token) {
						localStorage.setItem("token", data.token);
						localStorage.setItem("user", JSON.stringify(data.user));
						router.push("/dashboard");
					} else {
						setError("Login failed. Please try again.");
					}
				} catch (err) {
					setError("Invalid credentials");
				}
				setLoading(false);
			}

			return (
				<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
					<div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow p-8">
						<div className="mb-6 text-center">
							<h2 className="text-2xl font-bold">Welcome Back</h2>
							<p className="text-gray-500 dark:text-gray-400">Sign in to your AI Workflow Portal account</p>
						</div>
						<form onSubmit={handleLogin} className="space-y-4">
							<div className="space-y-2">
								<label htmlFor="email" className="text-sm font-medium">Email</label>
								<input
									id="email"
									type="email"
									placeholder="your@email.com"
									value={email}
									onChange={e => setEmail(e.target.value)}
									required
									className="w-full px-3 py-2 border rounded"
								/>
							</div>
							<div className="space-y-2">
								<label htmlFor="password" className="text-sm font-medium">Password</label>
								<input
									id="password"
									type="password"
									placeholder="Enter your password"
									value={password}
									onChange={e => setPassword(e.target.value)}
									required
									className="w-full px-3 py-2 border rounded"
								/>
							</div>
							{error && <div className="text-red-600 text-sm">{error}</div>}
							<button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded font-semibold hover:bg-primary/90 transition-colors" disabled={loading}>
								{loading ? 'Signing in...' : 'Sign In'}
							</button>
						</form>
						<div className="mt-4 text-center text-sm">
							Don't have an account?{' '}
							<Link href="/auth/register" className="text-primary hover:underline">Sign up</Link>
						</div>
					</div>
				</div>
			);
		}