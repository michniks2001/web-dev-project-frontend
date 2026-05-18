'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
	AUTH_API_ORIGIN,
	getOnboardingMe,
	postOnboardBuyer,
	postOnboardFirm,
	type OnboardingMeData,
} from '@/lib/backend-api';

const INDUSTRY_OPTIONS = [
	'Technology',
	'SaaS',
	'Fintech',
	'B2B',
	'Marketing',
	'Growth',
	'Operations',
	'Healthcare',
	'Strategy',
	'AI',
	'Cloud',
];

const SPECIALTY_OPTIONS = [
	'Strategy',
	'Operations',
	'Product Strategy',
	'Growth',
	'GTM',
	'Brand',
	'Efficiency',
	'Process',
	'Research',
	'Marketing',
	'SaaS',
];

function toggleInList(list: string[], value: string): string[] {
	return list.includes(value)
		? list.filter((v) => v !== value)
		: [...list, value];
}

function sluglessNote(): string {
	return 'We’ll generate your firm URL automatically based on your firm name.';
}

export default function OnboardingClient() {
	const router = useRouter();

	const [me, setMe] = useState<OnboardingMeData | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState<null | 'firm' | 'buyer'>(null);

	const [tab, setTab] = useState<'firm' | 'buyer'>('buyer');

	// Firm onboarding steps
	const [firmStep, setFirmStep] = useState<0 | 1 | 2 | 3>(0);
	const [firmForm, setFirmForm] = useState({
		name: '',
		contactEmail: '',
		location: '',
		websiteUrl: '',
		description: '',
	});
	const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
	const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
	const [teamMemberForm, setTeamMemberForm] = useState({
		fullName: '',
		email: '',
		title: '',
		specialties: '',
		role: 'MEMBER' as 'ADMIN' | 'MEMBER',
	});
	const [teamMembers, setTeamMembers] = useState<
		Array<{
			fullName: string;
			email: string;
			title?: string;
			specialties?: string[];
			role: 'ADMIN' | 'MEMBER';
		}>
	>([]);

	// Buyer onboarding
	const [buyerForm, setBuyerForm] = useState({
		companyName: '',
		companySize: '',
	});

	useEffect(() => {
		let cancelled = false;
		getOnboardingMe().then((result) => {
			if (cancelled) return;
			setMe(result.status === 'ok' ? result.data : null);
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const isFirmComplete = Boolean(me?.user?.firmMember);
	const isBuyerComplete = Boolean(me?.user?.buyer);
	const onboardingComplete = isFirmComplete || isBuyerComplete;

	const loginHref = useMemo(
		() =>
			`${AUTH_API_ORIGIN}/login?returnTo=${encodeURIComponent(
				typeof window !== 'undefined'
					? `${window.location.origin}/onboarding`
					: 'http://localhost:3000/onboarding',
			)}`,
		[],
	);

	async function submitFirm() {
		setSubmitError(null);
		setSubmitting('firm');
		try {
			const data = await postOnboardFirm({
				name: firmForm.name.trim(),
				industries: selectedIndustries,
				contactEmail: firmForm.contactEmail.trim(),
				location: firmForm.location.trim() || undefined,
				description: firmForm.description.trim() || undefined,
				websiteUrl: firmForm.websiteUrl.trim() || undefined,
				specialties: selectedSpecialties.length ? selectedSpecialties : undefined,
				teamMembers,
			});

			if (!data) {
				setSubmitError(
					'Could not complete firm onboarding. Please retry, and check the backend logs if it persists.',
				);
				return;
			}
			const updated = await getOnboardingMe();
			if (updated.status !== 'ok') return;
			setMe(updated.data);
			router.push('/me');
		} finally {
			setSubmitting(null);
		}
	}

	function addTeamMember() {
		const fullName = teamMemberForm.fullName.trim();
		const email = teamMemberForm.email.trim().toLowerCase();
		if (!fullName || !email) return;

		const specialties = teamMemberForm.specialties
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);

		setTeamMembers((curr) => {
			const next = curr.filter((m) => m.email !== email);
			next.push({
				fullName,
				email,
				title: teamMemberForm.title.trim() || undefined,
				specialties,
				role: teamMemberForm.role,
			});
			return next;
		});

		setTeamMemberForm({
			fullName: '',
			email: '',
			title: '',
			specialties: '',
			role: 'MEMBER',
		});
	}

	async function submitBuyer() {
		setSubmitError(null);
		setSubmitting('buyer');
		const companySize = buyerForm.companySize
			? Number(buyerForm.companySize)
			: undefined;

		try {
			const data = await postOnboardBuyer({
				companyName: buyerForm.companyName.trim() || undefined,
				companySize,
			});

			if (!data) {
				setSubmitError(
					'Could not complete buyer onboarding. Please retry, and check the backend logs if it persists.',
				);
				return;
			}
			const updated = await getOnboardingMe();
			if (updated.status !== 'ok') return;
			setMe(updated.data);
			router.push('/me');
		} finally {
			setSubmitting(null);
		}
	}

	if (loading) {
		return (
			<div className="rounded-xl border border-slate-200 bg-white p-6">
				Loading onboarding status...
			</div>
		);
	}

	// Not signed in
	if (!me?.authenticated) {
		return (
			<div className="space-y-4">
				<section className="rounded-xl border border-slate-200 bg-white p-6">
					<h1 className="text-3xl font-semibold tracking-tight">
						Welcome to Clarity
					</h1>
					<p className="mt-2 max-w-2xl text-sm text-slate-600">
						Sign in with Auth0, then create your firm storefront or buyer
						profile in a guided onboarding flow.
					</p>
					<div className="mt-5 flex flex-wrap gap-3">
						<a
							href={loginHref}
							className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
						>
							Continue with Auth0
						</a>
						<Link
							href="/signup"
							className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
						>
							Sign up
						</Link>
					</div>
				</section>
			</div>
		);
	}

	// Already completed
	if (onboardingComplete) {
		return (
			<div className="space-y-6">
				<section className="rounded-xl border border-slate-200 bg-white p-6">
					<h1 className="text-3xl font-semibold tracking-tight">Onboarding complete</h1>
					<p className="mt-2 text-sm text-slate-600">
						Signed in as <span className="font-medium">{me.user?.email}</span>
					</p>
				</section>

				<div className="grid gap-4 lg:grid-cols-2">
					<section className="rounded-xl border border-slate-200 bg-white p-6">
						<h2 className="text-lg font-semibold">Next</h2>
						<p className="mt-2 text-sm text-slate-600">
							View your account info and roles. From there, you can proceed with the
							workflows (firms or buyers).
						</p>
						<button
							type="button"
							className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
							onClick={() => router.push('/me')}
						>
							View user info
						</button>
					</section>

					<section className="rounded-xl border border-slate-200 bg-white p-6">
						<h2 className="text-lg font-semibold">Summary</h2>
						<ul className="mt-3 space-y-2 text-sm text-slate-600">
							<li>
								Firm: {me.user?.firmMember ? 'Yes' : 'No'}
								{me.user?.firmMember?.firm?.name
									? ` (${me.user.firmMember.firm.name})`
									: ''}
							</li>
							<li>Buyer: {me.user?.buyer ? 'Yes' : 'No'}</li>
						</ul>
					</section>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<section className="rounded-xl border border-slate-200 bg-white p-6">
				<h1 className="text-3xl font-semibold tracking-tight">Your onboarding</h1>
				<p className="mt-2 text-sm text-slate-600">
					Signed in as <span className="font-medium">{me.user?.email}</span>
				</p>

				<div className="mt-5 flex gap-2">
					<button
						type="button"
						className={`rounded-md px-3 py-1 text-sm font-medium ${
							tab === 'firm'
								? 'bg-slate-900 text-white'
								: 'bg-slate-100 text-slate-700'
						}`}
						onClick={() => {
							setTab('firm');
							setFirmStep(0);
						}}
					>
						Firm
					</button>
					<button
						type="button"
						className={`rounded-md px-3 py-1 text-sm font-medium ${
							tab === 'buyer'
								? 'bg-slate-900 text-white'
								: 'bg-slate-100 text-slate-700'
						}`}
						onClick={() => setTab('buyer')}
					>
						Buyer
					</button>
				</div>
			</section>
			{submitError ? (
				<section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
					{submitError}
				</section>
			) : null}

			{tab === 'firm' ? (
				<div className="grid gap-4 lg:grid-cols-2">
					<section className="rounded-xl border border-slate-200 bg-white p-6">
						<div className="mb-4">
							<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
								Firm survey
							</p>
							<p className="mt-2 text-sm text-slate-600">
								Step {firmStep + 1} of 4
							</p>
							<div className="mt-3 h-2 w-full overflow-hidden rounded bg-slate-100">
								<div
									className="h-full bg-slate-900"
									style={{ width: `${((firmStep + 1) / 4) * 100}%` }}
								/>
							</div>
						</div>

						{firmStep === 0 && (
							<div className="space-y-4">
								<label className="space-y-1">
									<span className="block text-sm font-medium text-slate-700">
										Firm name
									</span>
									<input
										className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
										value={firmForm.name}
										onChange={(e) =>
											setFirmForm((s) => ({ ...s, name: e.target.value }))
										}
										placeholder="Apex Consulting"
									/>
								</label>

								<div className="grid gap-4 md:grid-cols-2">
									<label className="space-y-1">
										<span className="block text-sm font-medium text-slate-700">
											Contact email
										</span>
										<input
											className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
											value={firmForm.contactEmail}
											onChange={(e) =>
												setFirmForm((s) => ({
													...s,
													contactEmail: e.target.value,
												}))
											}
											placeholder="hello@yourfirm.com"
										/>
									</label>
									<label className="space-y-1">
										<span className="block text-sm font-medium text-slate-700">
											Location (optional)
										</span>
										<input
											className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
											value={firmForm.location}
											onChange={(e) =>
												setFirmForm((s) => ({
													...s,
													location: e.target.value,
												}))
											}
											placeholder="New York, NY"
										/>
									</label>
								</div>

								<label className="space-y-1">
									<span className="block text-sm font-medium text-slate-700">
										Website URL (optional)
									</span>
									<input
										className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
										value={firmForm.websiteUrl}
										onChange={(e) =>
											setFirmForm((s) => ({
												...s,
												websiteUrl: e.target.value,
											}))
										}
										placeholder="https://apexconsulting.com"
									/>
								</label>

								<label className="space-y-1">
									<span className="block text-sm font-medium text-slate-700">
										Firm description (optional)
									</span>
									<textarea
										className="min-h-[120px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
										value={firmForm.description}
										onChange={(e) =>
											setFirmForm((s) => ({
												...s,
												description: e.target.value,
											}))
										}
										placeholder="What do you do, who do you help, and what outcomes do you drive?"
									/>
								</label>

								<div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
									{sluglessNote()}
								</div>

								<button
									type="button"
									className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
									onClick={() => setFirmStep(1)}
									disabled={!firmForm.name.trim() || !firmForm.contactEmail.trim()}
								>
									Next: industries
								</button>
							</div>
						)}

						{firmStep === 1 && (
							<div className="space-y-4">
								<p className="text-sm font-medium text-slate-800">
									Select industries your firm serves
								</p>
								<div className="flex flex-wrap gap-2">
									{INDUSTRY_OPTIONS.map((opt) => {
										const selected = selectedIndustries.includes(opt);
										return (
											<button
												type="button"
												key={opt}
												className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
													selected
														? 'border-slate-900 bg-slate-900 text-white'
														: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
												}`}
												onClick={() =>
													setSelectedIndustries((curr) =>
														toggleInList(curr, opt),
													)
												}
											>
												{opt}
											</button>
										);
									})}
								</div>

								<div className="flex items-center justify-between gap-3">
									<button
										type="button"
										className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
										onClick={() => setFirmStep(0)}
									>
										Back
									</button>
									<button
										type="button"
										className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
										onClick={() => setFirmStep(2)}
										disabled={!selectedIndustries.length}
									>
										Next: specialties
									</button>
								</div>
							</div>
						)}

						{firmStep === 2 && (
							<div className="space-y-4">
								<p className="text-sm font-medium text-slate-800">
									Select specialties (optional)
								</p>
								<div className="flex flex-wrap gap-2">
									{SPECIALTY_OPTIONS.map((opt) => {
										const selected = selectedSpecialties.includes(opt);
										return (
											<button
												type="button"
												key={opt}
												className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
													selected
														? 'border-slate-900 bg-slate-900 text-white'
														: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
												}`}
												onClick={() =>
													setSelectedSpecialties((curr) =>
														toggleInList(curr, opt),
													)
												}
											>
												{opt}
											</button>
										);
									})}
								</div>

								<div className="flex items-center justify-between gap-3">
									<button
										type="button"
										className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
										onClick={() => setFirmStep(1)}
									>
										Back
									</button>
									<button
										type="button"
										className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
										onClick={() => setFirmStep(3)}
										disabled={!firmForm.name.trim() || !firmForm.contactEmail.trim() || !selectedIndustries.length}
									>
										Next: team setup
									</button>
								</div>
							</div>
						)}

						{firmStep === 3 && (
							<div className="space-y-4">
								<p className="text-sm font-medium text-slate-800">
									Add your initial team members (optional)
								</p>
								<div className="grid gap-3 md:grid-cols-2">
									<input
										className="rounded-md border border-slate-300 px-3 py-2 text-sm"
										placeholder="Full name"
										value={teamMemberForm.fullName}
										onChange={(e) =>
											setTeamMemberForm((s) => ({ ...s, fullName: e.target.value }))
										}
									/>
									<input
										className="rounded-md border border-slate-300 px-3 py-2 text-sm"
										placeholder="Email"
										value={teamMemberForm.email}
										onChange={(e) =>
											setTeamMemberForm((s) => ({ ...s, email: e.target.value }))
										}
									/>
									<input
										className="rounded-md border border-slate-300 px-3 py-2 text-sm"
										placeholder="Title (optional)"
										value={teamMemberForm.title}
										onChange={(e) =>
											setTeamMemberForm((s) => ({ ...s, title: e.target.value }))
										}
									/>
									<select
										className="rounded-md border border-slate-300 px-3 py-2 text-sm"
										value={teamMemberForm.role}
										onChange={(e) =>
											setTeamMemberForm((s) => ({
												...s,
												role: e.target.value as 'ADMIN' | 'MEMBER',
											}))
										}
									>
										<option value="MEMBER">Member</option>
										<option value="ADMIN">Admin</option>
									</select>
									<input
										className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
										placeholder="Specialties (comma separated)"
										value={teamMemberForm.specialties}
										onChange={(e) =>
											setTeamMemberForm((s) => ({
												...s,
												specialties: e.target.value,
											}))
										}
									/>
								</div>
								<button
									type="button"
									className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
									onClick={addTeamMember}
									disabled={!teamMemberForm.fullName.trim() || !teamMemberForm.email.trim()}
								>
									Add team member
								</button>

								{teamMembers.length > 0 && (
									<div className="space-y-2 rounded-lg border border-slate-200 p-3">
										{teamMembers.map((member) => (
											<div
												key={member.email}
												className="flex items-center justify-between gap-3 text-sm"
											>
												<div>
													<p className="font-medium text-slate-800">
														{member.fullName} · {member.role}
													</p>
													<p className="text-slate-600">{member.email}</p>
												</div>
												<button
													type="button"
													className="text-xs font-medium text-rose-700 hover:underline"
													onClick={() =>
														setTeamMembers((curr) =>
															curr.filter((m) => m.email !== member.email),
														)
													}
												>
													Remove
												</button>
											</div>
										))}
									</div>
								)}

								<div className="flex items-center justify-between gap-3">
									<button
										type="button"
										className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
										onClick={() => setFirmStep(2)}
									>
										Back
									</button>
									<button
										type="button"
										className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
										onClick={submitFirm}
									disabled={
										submitting !== null ||
										!firmForm.name.trim() ||
										!firmForm.contactEmail.trim() ||
										!selectedIndustries.length
									}
									>
									{submitting === 'firm'
										? 'Creating firm...'
										: 'Create firm & finish'}
									</button>
								</div>
							</div>
						)}
					</section>

					<aside className="rounded-xl border border-slate-200 bg-white p-6">
						<h2 className="text-xl font-semibold">Why this matters</h2>
						<ul className="mt-4 space-y-2 text-sm text-slate-600">
							<li>Industries improve discovery matches.</li>
							<li>Specialties help firms assign leads internally.</li>
							<li>Team setup helps account managers onboard collaborators early.</li>
							<li>Slug is generated automatically for a clean storefront URL.</li>
						</ul>
						<div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
							After onboarding, your account page will show your roles and profile details.
						</div>
					</aside>
				</div>
			) : (
				<div className="grid gap-4 lg:grid-cols-2">
					<section className="rounded-xl border border-slate-200 bg-white p-6">
						<h2 className="text-xl font-semibold">Business profile</h2>
						<p className="mt-2 text-sm text-slate-600">
							Enter your company details so quote requests can be prefilled
							when you are signed in.
						</p>

						<div className="mt-5 space-y-4">
							<label className="space-y-1">
								<span className="block text-sm font-medium text-slate-700">
									Company name (optional)
								</span>
								<input
									className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
									value={buyerForm.companyName}
									onChange={(e) =>
										setBuyerForm((s) => ({
											...s,
											companyName: e.target.value,
										}))
									}
									placeholder="StartupCo"
								/>
							</label>

							<label className="space-y-1">
								<span className="block text-sm font-medium text-slate-700">
									Company size (optional, number)
								</span>
								<input
									className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
									value={buyerForm.companySize}
									onChange={(e) =>
										setBuyerForm((s) => ({
											...s,
											companySize: e.target.value,
										}))
									}
									placeholder="50"
								/>
							</label>

							<button
								type="button"
								className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
								onClick={submitBuyer}
								disabled={submitting !== null}
							>
								{submitting === 'buyer'
									? 'Creating buyer profile...'
									: 'Create buyer profile'}
							</button>
						</div>
					</section>

					<aside className="rounded-xl border border-slate-200 bg-white p-6">
						<h2 className="text-xl font-semibold">Next</h2>
						<p className="mt-2 text-sm text-slate-600">
							After onboarding, go to your account page and submit inquiries from there.
						</p>
						<div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
							Future: attach surveys and AI intake summary to the inquiry flow.
						</div>
					</aside>
				</div>
			)}
		</div>
	);
}


