import Papa from "papaparse";
import { useMutation } from "@tanstack/react-query";
import { insertCustomerSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function BulkImportModal({ isOpen, onClose, bulkImportName }) {
  const { toast } = useToast();
  const typeofBulkImport = bulkImportName.toLowerCase();

    const importMutation = useMutation({
        mutationFn: async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(`/api/${typeofBulkImport}/import`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Import failed");
            }
            return await res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Import Complete",
                description: `${data.message}`,
            });
            onClose();
        },
        onError: (err) => {
            toast({
                title: "Import Failed",
                description: err.message,
                variant: "destructive",
            });
        },
    });

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            toast({
                title: "No File Selected",
                description: "Please select a CSV file to import.",
                variant: "destructive",
            });
            return;
        }
        importMutation.mutate(file);
    };


  const filename = `${bulkImportName}_import.csv`;
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Import {bulkImportName}</h2>

        <div className="flex flex-col space-y-4">
          <label className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded text-center">
            Import CSV File
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          <a
            href={`/${filename}.csv`}
            download
            className="bg-green-500 text-white px-4 py-2 rounded text-center block text-sm"
          >
            Get Sample CSV File
          </a>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}