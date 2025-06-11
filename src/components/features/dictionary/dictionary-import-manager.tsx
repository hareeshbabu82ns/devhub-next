/**
 * Dictionary Import Management Component
 *
 * This component provides an admin interface for managing dictionary imports
 * with real-time progress tracking and comprehensive status information.
 */

"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  importSingleDictionary,
  importMultipleDictionariesAction,
  getAllDictionaryStatuses,
  deleteDictionaryWords,
  type DictionaryStatus,
} from "@/app/actions/dictionary-import-actions";
import {
  LEXICON_ALL_DICT,
  DictionaryName,
  LEXICON_ALL_DICT_TO_DB_MAP,
} from "@/lib/dictionary/dictionary-constants";
import { formatDistanceToNow } from "date-fns";
import { Icons } from "@/components/utils/icons";
import { DICTIONARY_ORIGINS_DDLB } from "@/app/(app)/dictionary/utils";

interface ImportProgress {
  dictionary: string;
  processed: number;
  total: number;
  percentage: number;
  isActive: boolean;
}

interface ImportOptions {
  limitRows?: number;
  chunkSize: number;
  validateData: boolean;
  deleteExisting: boolean;
  includeHtmlProcessing: boolean;
}

export function DictionaryImportManager() {
  const queryClient = useQueryClient();
  const [selectedDictionaries, setSelectedDictionaries] = useState<
    DictionaryName[]
  >([]);
  const [importProgress, setImportProgress] = useState<
    Record<string, ImportProgress>
  >({});
  const [showDeleteDialog, setShowDeleteDialog] =
    useState<DictionaryName | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    chunkSize: 1000,
    validateData: false,
    includeHtmlProcessing: true,
    // deleteExisting: false,
    deleteExisting: true,
    limitRows: 100,
  });

  // Query for dictionary statuses
  const {
    data: dictionaryStatuses,
    isLoading: statusLoading,
    error: statusError,
  } = useQuery({
    queryKey: ["dictionary-statuses"],
    queryFn: async () => {
      const result = await getAllDictionaryStatuses();
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Single dictionary import mutation
  const singleImportMutation = useMutation({
    mutationFn: async ({
      dictionary,
      options,
    }: {
      dictionary: DictionaryName;
      options: ImportOptions;
    }) => {
      const result = await importSingleDictionary({ dictionary, options });
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Import Successful",
        description: `${data.dictionary}: ${data.processedRows.toLocaleString()} words imported`,
      });
      queryClient.invalidateQueries({ queryKey: ["dictionary-statuses"] });
      setImportProgress((prev) => ({
        ...prev,
        [data.dictionary]: { ...prev[data.dictionary], isActive: false },
      }));
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Multiple dictionaries import mutation
  const multipleImportMutation = useMutation({
    mutationFn: async ({
      dictionaries,
      options,
    }: {
      dictionaries: DictionaryName[];
      options: ImportOptions;
    }) => {
      const result = await importMultipleDictionariesAction({
        dictionaries,
        options,
      });
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      const totalWords = data.reduce(
        (sum, result) => sum + result.processedRows,
        0,
      );
      toast({
        title: "Bulk Import Successful",
        description: `${data.length} dictionaries imported with ${totalWords.toLocaleString()} total words`,
      });
      queryClient.invalidateQueries({ queryKey: ["dictionary-statuses"] });
      setImportProgress({});
    },
    onError: (error) => {
      toast({
        title: "Bulk Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete dictionary mutation
  const deleteMutation = useMutation({
    mutationFn: async (dictionary: DictionaryName) => {
      const result = await deleteDictionaryWords({ dictionary });
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, dictionary) => {
      toast({
        title: "Dictionary Deleted",
        description: `${dictionary}: ${data.deletedCount.toLocaleString()} words deleted`,
      });
      queryClient.invalidateQueries({ queryKey: ["dictionary-statuses"] });
      setShowDeleteDialog(null);
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSingleImport = (dictionary: DictionaryName) => {
    setImportProgress((prev) => ({
      ...prev,
      [dictionary]: {
        dictionary,
        processed: 0,
        total: 0,
        percentage: 0,
        isActive: true,
      },
    }));
    singleImportMutation.mutate({ dictionary, options: importOptions });
  };

  const handleBulkImport = () => {
    if (selectedDictionaries.length === 0) {
      toast({
        title: "No Dictionaries Selected",
        description: "Please select at least one dictionary to import",
        variant: "destructive",
      });
      return;
    }

    // Initialize progress for all selected dictionaries
    const initialProgress = Object.fromEntries(
      selectedDictionaries.map((dict) => [
        dict,
        {
          dictionary: dict,
          processed: 0,
          total: 0,
          percentage: 0,
          isActive: true,
        },
      ]),
    );
    setImportProgress(initialProgress);

    multipleImportMutation.mutate({
      dictionaries: selectedDictionaries,
      options: importOptions,
    });
  };

  const handleSelectAll = () => {
    if (selectedDictionaries.length === LEXICON_ALL_DICT.length) {
      setSelectedDictionaries([]);
    } else {
      setSelectedDictionaries([...LEXICON_ALL_DICT]);
    }
  };

  const getDictionaryDisplayName = (dictionary: DictionaryName) => {
    const origin =
      LEXICON_ALL_DICT_TO_DB_MAP[dictionary] || dictionary.toUpperCase();

    return (
      DICTIONARY_ORIGINS_DDLB.find((item) => item.value === origin)?.label ||
      origin
    );
  };

  const getStatusBadge = (status: DictionaryStatus) => {
    if (!status.sqliteFileExists) {
      return <Badge variant="destructive">SQLite Missing</Badge>;
    }
    if (status.wordCount === 0) {
      return <Badge variant="secondary">Not Imported</Badge>;
    }
    return (
      <Badge variant="default">{status.wordCount.toLocaleString()} words</Badge>
    );
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Icons.spinner className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading dictionary statuses...</span>
        </CardContent>
      </Card>
    );
  }

  if (statusError || !dictionaryStatuses) {
    return (
      <Card>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load dictionary statuses. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const bulkOperations = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bulk Import</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSelectAll} size="sm">
              {selectedDictionaries.length === LEXICON_ALL_DICT.length
                ? "Deselect All"
                : "Select All"}
            </Button>
            <Button
              onClick={handleBulkImport}
              disabled={
                multipleImportMutation.isPending ||
                selectedDictionaries.length === 0
              }
              size="sm"
            >
              {multipleImportMutation.isPending ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import Selected (${selectedDictionaries.length})`
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {LEXICON_ALL_DICT.map((dictionary) => (
            <div key={dictionary} className="flex items-center space-x-2">
              <Checkbox
                id={`bulk-${dictionary}`}
                checked={selectedDictionaries.includes(dictionary)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedDictionaries((prev) => [...prev, dictionary]);
                  } else {
                    setSelectedDictionaries((prev) =>
                      prev.filter((d) => d !== dictionary),
                    );
                  }
                }}
              />
              <Label htmlFor={`bulk-${dictionary}`} className="text-sm">
                {dictionary.toUpperCase()}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
      {/* Import Options */}
      <Card>
        <CardHeader>
          <CardTitle>Import Configuration</CardTitle>
          <CardDescription>
            Configure options for dictionary imports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="limit-rows">Row Limit (optional)</Label>
              <Input
                id="limit-rows"
                type="number"
                placeholder="No limit"
                value={importOptions.limitRows || ""}
                onChange={(e) =>
                  setImportOptions((prev) => ({
                    ...prev,
                    limitRows: e.target.value
                      ? parseInt(e.target.value, 10)
                      : undefined,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chunk-size">Chunk Size</Label>
              <Select
                value={importOptions.chunkSize.toString()}
                onValueChange={(value) =>
                  setImportOptions((prev) => ({
                    ...prev,
                    chunkSize: parseInt(value, 10),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1,000</SelectItem>
                  <SelectItem value="2000">2,000</SelectItem>
                  <SelectItem value="5000">5,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="validate-data"
                  checked={importOptions.validateData}
                  onCheckedChange={(checked) =>
                    setImportOptions((prev) => ({
                      ...prev,
                      validateData: checked,
                    }))
                  }
                />
                <Label htmlFor="validate-data">Validate Data</Label>
              </div>
            </div>
            <div className="space-y-2">
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
                <Label htmlFor="delete-existing">Delete Existing</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      {/* {bulkOperations} */}

      {/* Dictionary Status List */}
      <Card>
        <CardHeader>
          <CardTitle>Dictionary Status</CardTitle>
          <CardDescription>
            Current status and management for all dictionaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dictionaryStatuses.map((status) => (
              <div key={status.dictionary} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="font-medium">
                        {getDictionaryDisplayName(status.dictionary)}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {status.dictionary.toUpperCase()}
                        {status.lastImported && (
                          <span className="ml-2">
                            (Last imported{" "}
                            {formatDistanceToNow(status.lastImported)} ago)
                          </span>
                        )}
                      </p>
                    </div>
                    {getStatusBadge(status)}
                  </div>

                  <div className="flex items-center space-x-2">
                    {importProgress[status.dictionary]?.isActive && (
                      <div className="flex items-center space-x-2">
                        <Progress
                          value={importProgress[status.dictionary].percentage}
                          className="w-32"
                        />
                        <span className="text-sm">
                          {importProgress[status.dictionary].percentage.toFixed(
                            1,
                          )}
                          %
                        </span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSingleImport(status.dictionary)}
                      disabled={
                        !status.sqliteFileExists ||
                        singleImportMutation.isPending ||
                        importProgress[status.dictionary]?.isActive
                      }
                    >
                      {importProgress[status.dictionary]?.isActive ? (
                        <>
                          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        "Import"
                      )}
                    </Button>

                    {status.wordCount > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteDialog(status.dictionary)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={showDeleteDialog !== null}
        onOpenChange={() => setShowDeleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dictionary Words</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all words from the{" "}
              <strong>
                {showDeleteDialog && getDictionaryDisplayName(showDeleteDialog)}
              </strong>{" "}
              dictionary? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (showDeleteDialog) {
                  deleteMutation.mutate(showDeleteDialog);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
