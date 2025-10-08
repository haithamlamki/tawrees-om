// Utility functions for CSV export

export const downloadCSV = (data: string, filename: string) => {
  const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const arrayToCSV = (data: any[], headers?: string[]): string => {
  if (data.length === 0) return "";
  
  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create header row
  const headerRow = csvHeaders.join(",");
  
  // Create data rows
  const dataRows = data.map((row) => {
    return csvHeaders
      .map((header) => {
        const value = row[header];
        
        // Handle null/undefined
        if (value === null || value === undefined) return "";
        
        // Handle objects and arrays (stringify them)
        if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        
        // Handle strings with commas or quotes
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      })
      .join(",");
  });
  
  return [headerRow, ...dataRows].join("\n");
};

export const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const data: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      
      // Try to parse as JSON if it looks like an object/array
      if ((value.startsWith("{") && value.endsWith("}")) || (value.startsWith("[") && value.endsWith("]"))) {
        try {
          row[header] = JSON.parse(value);
        } catch {
          row[header] = value;
        }
      } else if (value === "") {
        row[header] = null;
      } else if (!isNaN(Number(value)) && value !== "") {
        row[header] = Number(value);
      } else {
        row[header] = value;
      }
    });
    
    data.push(row);
  }
  
  return data;
};
