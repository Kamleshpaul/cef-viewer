import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import CefViewer from "#/components/CefViewer";

export const Route = createFileRoute("/")({ component: App });

const SAMPLE_CEF = `CEF:0|security|threatmanager|1.0|100|detected an equal sign ("=") in extension value|10|src=10.0.0.1 act=blocked a equal \\= dst=1.1.1.1 rt=1234567890000`;

function App() {
	const [message, setMessage] = useState(SAMPLE_CEF);
	const [showComments, setShowComments] = useState(true);

	return (
		<main className="app-shell">
			<header className="app-chrome">
				<div className="app-chrome-leading">
					<div className="app-chrome-brand">
						<img
							className="app-chrome-logo"
							src="/icon.png"
							width={44}
							height={44}
							alt=""
							decoding="async"
						/>
						<div className="app-chrome-titles">
							<h1 className="app-chrome-title">CEF Viewer</h1>
							<p className="app-chrome-tagline">
								Paste or edit a CEF line — fields parse locally in your browser.
							</p>
						</div>
					</div>
				</div>
				<span className="app-chrome-meta">Local-only · no network</span>
			</header>
			<div className="app-body">
				<section className="app-pane app-pane--editor" aria-label="CEF input">
					<header className="app-pane-head">
						<span className="app-pane-head-title">Event message</span>
					</header>
					<textarea
						id="cef-input"
						className="app-cef-input"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						spellCheck={false}
						rows={3}
						placeholder="CEF:0|Vendor|Product|1.0|100|Name|5|key=value …"
						autoComplete="off"
					/>
				</section>
				<section
					className="app-pane app-pane--output"
					aria-label="Parsed output"
					tabIndex={-1}
				>
					<CefViewer
						message={message}
						showComments={showComments}
						onShowCommentsChange={setShowComments}
					/>
				</section>
			</div>
		</main>
	);
}
