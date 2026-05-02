import DigestDashboard from "@/components/DigestDashboard";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Home() {
    return (
        <ErrorBoundary>
            <DigestDashboard />
        </ErrorBoundary>
    );
}
