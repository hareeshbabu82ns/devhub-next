"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Upload,
  Eye,
  FileText,
  Database,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  parseSanskritSahityaFile,
  importSanskritSahityaData,
  readSanskritSahityaJsonFile,
} from "@/app/actions/sanskrit-sahitya-import-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ENTITY_TYPES_DDLB, ENTITY_TYPES_PARENTS } from "@/lib/constants";
import EntitySearchDlgTrigger from "@/app/(app)/entities/_components/EntitySearchDlgTrigger";

// Types for the parsed data
interface LanguageValue {
  language: string;
  value: string;
}

interface ParsedEntity {
  type: string;
  text: LanguageValue[];
  meaning: LanguageValue[];
  order: number;
  bookmarked: boolean;
  attributes: Array<{ key: string; value: string }>;
  notes: string;
}

interface ParsedHierarchy {
  book: ParsedEntity;
  chapters: ParsedEntity[];
  verses: ParsedEntity[];
}

interface FileItem {
  path: string;
  name: string;
}

// Available Sanskrit Sahitya files from data/sanskritsahitya-com-data
const AVAILABLE_FILES: FileItem[] = [
  { path: "amarushatakam/amarushatakam.json", name: "Amarushatakam" },
  { path: "bhattikavyam/bhattikavyam.json", name: "Bhattikavyam" },
  {
    path: "kadambarisangraha/kadambarisangraha.json",
    name: "Kadambari Sangraha",
  },
  { path: "kiratarjuniyam/kiratarjuniyam.json", name: "Kiratarjuniyam" },
  { path: "kumarasambhavam/kumarasambhavam.json", name: "Kumarasambhavam" },
  { path: "mahabharatam/mahabharatam.json", name: "Mahabharatam" },
  { path: "meghadutam/meghadutam.json", name: "Meghadutam" },
  {
    path: "naishadhiyacaritam/naishadhiyacaritam.json",
    name: "Naishadhiyacaritam",
  },
  { path: "pancatantram/pancatantram.json", name: "Pancatantram" },
  { path: "raghuvansham/raghuvansham.json", name: "Raghuvansham" },
  { path: "ramayanam/ramayanam.json", name: "Ramayanam" },
  { path: "rtusamharam/rtusamharam.json", name: "Rtusamharam" },
  { path: "shakuntalam/shakuntalam.json", name: "Shakuntalam" },
  { path: "shatakatrayam/shatakatrayam.json", name: "Shatakatrayam" },
  { path: "shishupalavadham/shishupalavadham.json", name: "Shishupalavadham" },
  {
    path: "srimadbhagavadgita/srimadbhagavadgita.json",
    name: "Srimad Bhagavad Gita",
  },
];

type WizardStep =
  | "SELECT_FILE"
  | "PREVIEW_JSON"
  | "PREVIEW_ENTITIES"
  | "IMPORT_TO_DB";

const STEP_LABELS = {
  SELECT_FILE: "Select File",
  PREVIEW_JSON: "Preview JSON",
  PREVIEW_ENTITIES: "Preview Entities",
  IMPORT_TO_DB: "Import to Database",
};

export function ScraperSanskritSahitya() {
  const [currentStep, setCurrentStep] = useState<WizardStep>("SELECT_FILE");
  const [selectedFile, setSelectedFile] = useState("");
  const [rawJsonData, setRawJsonData] = useState<any>(null);
  const [parsedData, setParsedData] = useState<ParsedHierarchy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [importOptions, setImportOptions] = useState({
    deleteExisting: false,
    bookmarkAll: false,
    defaultLanguage: "SAN",
    meaningLanguage: "ENG",
    entityType: "KAVYAM",
    parentId: "",
  });

  // Step navigation functions
  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const steps: WizardStep[] = [
      "SELECT_FILE",
      "PREVIEW_JSON",
      "PREVIEW_ENTITIES",
      "IMPORT_TO_DB",
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: WizardStep[] = [
      "SELECT_FILE",
      "PREVIEW_JSON",
      "PREVIEW_ENTITIES",
      "IMPORT_TO_DB",
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // File selection and JSON preview
  const handleFileSelection = async () => {
    if (!selectedFile) {
      toast({
        title: "File Required",
        description: "Please select a file to preview",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Construct the full path for the Sanskrit Sahitya data
      const fullPath = `data/sanskritsahitya-com-data/${selectedFile}`;

      // Use server action to read the raw JSON for preview
      const result = await readSanskritSahityaJsonFile(fullPath);

      if (result.status === "success") {
        setRawJsonData(result.data);
        nextStep();
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading file:", error);
      toast({
        title: "Error",
        description: `Failed to load file: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Parse JSON to entity format
  const handleParseToEntities = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      // Construct the full path for the Sanskrit Sahitya data
      const fullPath = `data/sanskritsahitya-com-data/${selectedFile}`;

      const result = await parseSanskritSahityaFile(fullPath, {
        defaultLanguage: importOptions.defaultLanguage,
        meaningLanguage: importOptions.meaningLanguage,
        bookmarkAll: importOptions.bookmarkAll,
        entityType: importOptions.entityType,
        parentId: importOptions.parentId,
      });

      if (result.status === "success") {
        setParsedData(result.data);
        nextStep();
      } else {
        toast({
          title: "Parsing Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast({
        title: "Error",
        description: `Failed to parse file: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Import to database
  const handleImportToDatabase = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const result = await importSanskritSahityaData({
        filePath: `data/sanskritsahitya-com-data/${selectedFile}`,
        options: importOptions,
      });

      if (result.status === "success") {
        toast({
          title: "Success",
          description: `Successfully imported ${result.data.entitiesCreated} entities for "${result.data.bookTitle}"`,
        });
        // Reset to first step for next import
        setCurrentStep("SELECT_FILE");
        setSelectedFile("");
        setRawJsonData(null);
        setParsedData(null);
      } else {
        toast({
          title: "Import Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error importing data:", error);
      toast({
        title: "Error",
        description: `Failed to import data: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Progress indicator
  const renderProgressIndicator = () => {
    const steps: WizardStep[] = [
      "SELECT_FILE",
      "PREVIEW_JSON",
      "PREVIEW_ENTITIES",
      "IMPORT_TO_DB",
    ];
    const currentIndex = steps.indexOf(currentStep);

    return (
      <div className="flex items-center space-x-2 mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <div
              className={`flex items-center space-x-2 cursor-pointer p-2 rounded-lg transition-colors ${
                index <= currentIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
              onClick={() => index <= currentIndex && goToStep(step)}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index <= currentIndex
                    ? "bg-primary-foreground text-primary"
                    : "bg-muted-foreground text-muted"
                }`}
              >
                {index + 1}
              </div>
              <span className="text-sm font-medium">{STEP_LABELS[step]}</span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Step 1: File Selection
  const renderFileSelection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Select Sanskrit Sahitya JSON File
        </CardTitle>
        <CardDescription>
          Choose a Sanskrit literature JSON file from the available collection
          to import. ({AVAILABLE_FILES.length} files available)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-select">Available Files:</Label>
          <Select value={selectedFile} onValueChange={setSelectedFile}>
            <SelectTrigger id="file-select">
              <SelectValue placeholder="Select a Sanskrit literature file..." />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_FILES.map((file: FileItem) => (
                <SelectItem key={file.path} value={file.path}>
                  {file.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleFileSelection}
            disabled={!selectedFile || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {isLoading ? "Loading..." : "Preview JSON"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 2: JSON Preview
  const renderJsonPreview = () => {
    if (!rawJsonData) return null;

    const { title, data } = rawJsonData;
    const firstFewRecords = data.slice(0, 5); // Show first 5 records
    const totalRecords = data.length;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            JSON Preview: {title}
          </CardTitle>
          <CardDescription>
            Showing first {firstFewRecords.length} of {totalRecords} records
            from the JSON file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Badge variant="secondary">Title</Badge>
              <p className="mt-1 font-medium">{title}</p>
            </div>
            <div>
              <Badge variant="secondary">Total Records</Badge>
              <p className="mt-1 font-medium">{totalRecords} verses</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Sample Records:</h4>
            {firstFewRecords.map((record: any, index: number) => (
              <Collapsible key={index}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
                  <span className="font-medium">
                    Verse {record.n} (Index: {record.i})
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-3 border rounded-lg mt-2 bg-background">
                  <div className="space-y-2 text-sm">
                    <div>
                      <Badge variant="outline">Sanskrit Text</Badge>
                      <p className="mt-1 text-lg">{record.v}</p>
                    </div>
                    {record.vd && (
                      <div>
                        <Badge variant="outline">Commentary</Badge>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                          {record.vd.substring(0, 200)}...
                        </p>
                      </div>
                    )}
                    {record.ch && (
                      <div>
                        <Badge variant="outline">Meter</Badge>
                        <p className="mt-1">{record.ch.n}</p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

          {totalRecords > 5 && (
            <Alert>
              <AlertDescription>
                Only showing first 5 records. The complete file contains{" "}
                {totalRecords} verses.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              Back
            </Button>
            <Button onClick={handleParseToEntities} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              {isLoading ? "Parsing..." : "Preview Entities"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 3: Entity Preview
  const renderEntityPreview = () => {
    if (!parsedData) return null;

    const { book, chapters, verses } = parsedData;
    const sampleVerses = verses.slice(0, 3); // Show first 3 verses

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Entity Preview
          </CardTitle>
          <CardDescription>
            Preview how the data will look after conversion to DevHub entity
            format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Import Options */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-3">Import Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entity-type">Entity Type</Label>
                <Select
                  value={importOptions.entityType}
                  onValueChange={(value) =>
                    setImportOptions((prev) => ({
                      ...prev,
                      entityType: value,
                    }))
                  }
                >
                  <SelectTrigger id="entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES_DDLB.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent-id">Parent Entity</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="parent-id"
                    placeholder="Enter parent entity ID"
                    value={importOptions.parentId}
                    onChange={(e) =>
                      setImportOptions((prev) => ({
                        ...prev,
                        parentId: e.target.value,
                      }))
                    }
                  />
                  <EntitySearchDlgTrigger
                    open={dlgOpen}
                    forTypes={
                      ENTITY_TYPES_PARENTS[
                        importOptions.entityType as keyof typeof ENTITY_TYPES_PARENTS
                      ] || []
                    }
                    onOpenChange={(open) => setDlgOpen(open)}
                    onClick={(entity) => {
                      setImportOptions((prev) => ({
                        ...prev,
                        parentId: entity.id,
                      }));
                      setDlgOpen(false);
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-lang">Default Language</Label>
                <Select
                  value={importOptions.defaultLanguage}
                  onValueChange={(value) =>
                    setImportOptions((prev) => ({
                      ...prev,
                      defaultLanguage: value,
                    }))
                  }
                >
                  <SelectTrigger id="default-lang">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAN">Sanskrit (SAN)</SelectItem>
                    <SelectItem value="HIN">Hindi (HIN)</SelectItem>
                    <SelectItem value="ENG">English (ENG)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meaning-lang">Meaning Language</Label>
                <Select
                  value={importOptions.meaningLanguage}
                  onValueChange={(value) =>
                    setImportOptions((prev) => ({
                      ...prev,
                      meaningLanguage: value,
                    }))
                  }
                >
                  <SelectTrigger id="meaning-lang">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENG">English (ENG)</SelectItem>
                    <SelectItem value="HIN">Hindi (HIN)</SelectItem>
                    <SelectItem value="SAN">Sanskrit (SAN)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="bookmark-all"
                  checked={importOptions.bookmarkAll}
                  onCheckedChange={(checked) =>
                    setImportOptions((prev) => ({
                      ...prev,
                      bookmarkAll: checked,
                    }))
                  }
                />
                <Label htmlFor="bookmark-all">Bookmark all entities</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="delete-existing"
                  checked={importOptions.deleteExisting}
                  onCheckedChange={(checked) =>
                    setImportOptions((prev) => ({
                      ...prev,
                      deleteExisting: checked,
                    }))
                  }
                />
                <Label htmlFor="delete-existing">Delete existing data</Label>
              </div>
            </div>
          </div>

          {/* Entity Structure Preview */}
          <div className="space-y-4">
            <h4 className="font-medium">Entity Structure:</h4>

            {/* Book Entity */}
            <div className="p-3 border rounded-lg">
              <Badge className="mb-2">Book Entity</Badge>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Type:</strong> {book.type}
                </p>
                <p>
                  <strong>Text:</strong> {book.text[0]?.value}
                </p>
                <p>
                  <strong>Bookmarked:</strong> {book.bookmarked ? "Yes" : "No"}
                </p>
              </div>
            </div>

            {/* Chapter Entities */}
            {chapters.length > 0 && (
              <div className="p-3 border rounded-lg">
                <Badge variant="secondary" className="mb-2">
                  Chapter Entities ({chapters.length})
                </Badge>
                <div className="text-sm">
                  <p>
                    Chapter entities will be created as needed based on the
                    content structure.
                  </p>
                </div>
              </div>
            )}

            {/* Sample Verse Entities */}
            <div className="space-y-2">
              <Badge variant="outline">
                Sample Verse Entities (showing {sampleVerses.length} of{" "}
                {verses.length})
              </Badge>
              {sampleVerses.map((verse, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg bg-background"
                >
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <span>
                        <strong>Order:</strong> {verse.order}
                      </span>
                      <Badge
                        variant={verse.bookmarked ? "default" : "outline"}
                        className="text-xs"
                      >
                        {verse.bookmarked ? "Bookmarked" : "Not bookmarked"}
                      </Badge>
                    </div>
                    <div>
                      <strong>Text ({verse.text[0]?.language}):</strong>
                      <p className="mt-1 text-lg">{verse.text[0]?.value}</p>
                    </div>
                    {verse.meaning.length > 0 && (
                      <div>
                        <strong>Meaning ({verse.meaning[0]?.language}):</strong>
                        <p className="mt-1 text-muted-foreground">
                          {verse.meaning[0]?.value.substring(0, 100)}...
                        </p>
                      </div>
                    )}
                    {verse.attributes.length > 0 && (
                      <div>
                        <strong>Attributes:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {verse.attributes.map((attr, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs"
                            >
                              {attr.key}: {attr.value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Total entities to be created: 1 book + {chapters.length} chapters
              + {verses.length} verses = {1 + chapters.length + verses.length}{" "}
              entities
            </AlertDescription>
          </Alert>

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              Back
            </Button>
            <Button onClick={() => nextStep()}>Proceed to Import</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 4: Database Import
  const renderDatabaseImport = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Import to Database
        </CardTitle>
        <CardDescription>
          Final step: Import the parsed entities to the DevHub database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {parsedData && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Import Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Badge variant="secondary">Book</Badge>
                <p className="mt-1">{parsedData.book.text[0]?.value}</p>
              </div>
              <div>
                <Badge variant="secondary">Total Entities</Badge>
                <p className="mt-1">
                  {1 + parsedData.chapters.length + parsedData.verses.length}
                </p>
              </div>
              <div>
                <Badge variant="secondary">Chapters</Badge>
                <p className="mt-1">{parsedData.chapters.length}</p>
              </div>
              <div>
                <Badge variant="secondary">Verses</Badge>
                <p className="mt-1">{parsedData.verses.length}</p>
              </div>
            </div>
          </div>
        )}

        <Alert>
          <AlertDescription>
            {importOptions.deleteExisting
              ? "⚠️ Warning: This will delete existing data with the same book title before importing."
              : "ℹ️ This will add new entities to the database alongside existing data."}
          </AlertDescription>
        </Alert>

        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep}>
            Back
          </Button>
          <Button
            onClick={handleImportToDatabase}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isLoading ? "Importing..." : "Import to Database"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 flex-1 overflow-auto">
      <div className="prose">
        <h3>Sanskrit Sahitya Import</h3>
        <p className="text-muted-foreground">
          Import Sanskrit literature data from sanskritsahitya.com JSON format
          into DevHub entities. This tool provides a step-by-step process to
          preview and import the data.
        </p>
      </div>

      {renderProgressIndicator()}

      {currentStep === "SELECT_FILE" && renderFileSelection()}
      {currentStep === "PREVIEW_JSON" && renderJsonPreview()}
      {currentStep === "PREVIEW_ENTITIES" && renderEntityPreview()}
      {currentStep === "IMPORT_TO_DB" && renderDatabaseImport()}
    </div>
  );
}
