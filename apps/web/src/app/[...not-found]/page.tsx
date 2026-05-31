import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { PAGE_DESCRIPTIONS, PAGE_KEYWORDS } from "@/lib/metadata-constants";
import Link from "next/link";

export const metadata: Metadata = createPageMetadata({
  title: "Página Não Encontrada",
  description: PAGE_DESCRIPTIONS.ERROR_404,
  keywords: PAGE_KEYWORDS.ERROR_404,
  noIndex: true,
});

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mb-8">
              <div className="text-6xl font-bold text-gray-400">404</div>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">Página Não Encontrada</h1>
            </div>
            <p className="mt-4 text-gray-600">
              {PAGE_DESCRIPTIONS.ERROR_404}
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Voltar ao início
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
