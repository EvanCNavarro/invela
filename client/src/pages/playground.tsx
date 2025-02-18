import { CompanySearchPlayground } from "@/components/playground/CompanySearchPlayground";
import { HeadlessSearchDemo } from "@/components/playground/HeadlessSearchDemo";

export default function PlaygroundPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-6">Company Data Crawler</h1>
        <CompanySearchPlayground />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Headless Search Demo</h2>
        <HeadlessSearchDemo />
      </div>
    </div>
  );
}