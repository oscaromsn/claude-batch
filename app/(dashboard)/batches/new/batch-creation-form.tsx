"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Plus, Loader2, Check, LightbulbIcon, BeakerIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { batchCreationSchema, type BatchCreation } from "@/lib/validation/batch.schema";

// Beta headers suggestions with descriptions
const BETA_HEADER_SUGGESTIONS = [
  {
    name: "anthropic-beta",
    value: "output-128k-2025-02-19",
    description: "Extends output tokens up to 128k (Claude 3.7 Sonnet only)",
    modelRestriction: "claude-3-7-sonnet-20240613"
  },
  {
    name: "anthropic-beta",
    value: "computer-use-2025-01-24",
    description: "Enables computer use capability",
    modelRestriction: null
  }
];

// Model token limits
const MODEL_TOKEN_LIMITS = {
  "claude-3-7-sonnet-20240613": {
    standardLimit: 8192,
    extendedLimit: 128000, // with output-128k beta flag
    thinkingLimit: 64000, // when thinking mode is enabled
    supportsThinking: true
  },
  "claude-3-5-sonnet-20241022": {
    standardLimit: 8192,
    extendedLimit: 8192,
    thinkingLimit: 8192, // same as standard
    supportsThinking: false
  },
  "claude-3-5-haiku-20241022": {
    standardLimit: 8192,
    extendedLimit: 8192,
    thinkingLimit: 8192, // same as standard
    supportsThinking: false
  },
  "claude-3-5-sonnet-20240620": {
    standardLimit: 8192,
    extendedLimit: 8192,
    thinkingLimit: 8192, // same as standard
    supportsThinking: false
  },
  "claude-3-opus-20240229": {
    standardLimit: 4096,
    extendedLimit: 4096,
    thinkingLimit: 4096, // same as standard
    supportsThinking: false
  },
  "claude-3-sonnet-20240229": {
    standardLimit: 4096,
    extendedLimit: 4096,
    thinkingLimit: 4096, // same as standard
    supportsThinking: false
  },
  "claude-3-haiku-20240307": {
    standardLimit: 4096,
    extendedLimit: 4096,
    thinkingLimit: 4096, // same as standard
    supportsThinking: false
  }
};

export default function BatchCreationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExtendedOutputFlag, setHasExtendedOutputFlag] = useState(false);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [tokenLimitExceeded, setTokenLimitExceeded] = useState(false);
  const defaultModel = "claude-3-7-sonnet-20240613";
  const defaultModelLimits = MODEL_TOKEN_LIMITS[defaultModel];
  const [tokenLimit, setTokenLimit] = useState(defaultModelLimits.standardLimit);
  const [currentModel, setCurrentModel] = useState<string>(defaultModel);
  const [thinkingBudget, setThinkingBudget] = useState(5000);

  const form = useForm<BatchCreation>({
    resolver: zodResolver(batchCreationSchema),
    defaultValues: {
      name: "",
      messages: [{ role: "user", content: "" }],
      model: defaultModel,
      temperature: 0.7,
      maxTokens: defaultModelLimits.standardLimit,
      stopSequences: [],
      betaHeaders: [],
      anthropicVersion: "2023-06-01",
      thinkingBudget: 5000
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "messages",
  });

  const { 
    fields: betaHeaderFields, 
    append: appendBetaHeader, 
    remove: removeBetaHeader
  } = useFieldArray({
    control: form.control,
    name: "betaHeaders",
  });

  // Update token limit when model changes or extended output flag changes
  useEffect(() => {
    const selectedModel = form.getValues("model");
    setCurrentModel(selectedModel);
    
    const modelLimits = MODEL_TOKEN_LIMITS[selectedModel as keyof typeof MODEL_TOKEN_LIMITS];
    if (!modelLimits) return;
    
    // Check if the extended output flag is present
    const hasOutputFlag = betaHeaderFields.some(
      field => field.name === "anthropic-beta" && field.value === "output-128k-2025-02-19"
    );
    setHasExtendedOutputFlag(hasOutputFlag);
    
    // Set the appropriate token limit - 128k flag always takes precedence
    let limit;
    if (hasOutputFlag && selectedModel === "claude-3-7-sonnet-20240613") {
      limit = modelLimits.extendedLimit;
    } else if (isThinkingEnabled && modelLimits.supportsThinking) {
      limit = modelLimits.thinkingLimit || modelLimits.standardLimit;
    } else {
      limit = modelLimits.standardLimit;
    }
    setTokenLimit(limit);
    
    // Update maxTokens to match the new limit if it exceeds the new limit
    const currentMaxTokens = form.getValues("maxTokens");
    if (currentMaxTokens > limit) {
      form.setValue("maxTokens", limit);
    } else if (hasOutputFlag && selectedModel === "claude-3-7-sonnet-20240613" && currentMaxTokens < limit) {
      // If enabling 128k flag, bump up maxTokens to the extended limit
      form.setValue("maxTokens", limit);
    }
    
    // Update thinking enabled state
    const supportsThinking = modelLimits.supportsThinking;
    if (!supportsThinking) {
      setIsThinkingEnabled(false);
    }
    
    // Validate token limits
    validateTokenLimits();
  }, [betaHeaderFields, form.watch("model"), isThinkingEnabled]);

  // Validate token limits whenever maxTokens or thinkingBudget changes
  useEffect(() => {
    validateTokenLimits();
  }, [form.watch("maxTokens"), form.watch("thinkingBudget"), isThinkingEnabled]);

  // Function to validate token limits
  const validateTokenLimits = () => {
    const maxOutput = Number(form.getValues("maxTokens")) || 0;
    const thinkingBudget = isThinkingEnabled ? (Number(form.getValues("thinkingBudget")) || 0) : 0;
    const totalTokens = maxOutput + thinkingBudget;
    
    setTokenLimitExceeded(totalTokens > tokenLimit);
  };

  // Add beta header suggestion
  const addBetaHeaderSuggestion = (name: string, value: string) => {
    // Check if this header already exists
    const existingIndex = betaHeaderFields.findIndex(
      field => field.name === name && field.value === value
    );
    
    if (existingIndex >= 0) {
      // Remove it if it exists
      removeBetaHeader(existingIndex);
      
      // If removing extended output flag, adjust maxTokens if needed
      if (name === "anthropic-beta" && value === "output-128k-2025-02-19") {
        const modelLimits = MODEL_TOKEN_LIMITS[currentModel as keyof typeof MODEL_TOKEN_LIMITS];
        if (modelLimits) {
          const newLimit = isThinkingEnabled && modelLimits.supportsThinking 
            ? modelLimits.thinkingLimit 
            : modelLimits.standardLimit;
          
          const currentMaxTokens = form.getValues("maxTokens");
          if (currentMaxTokens > newLimit) {
            form.setValue("maxTokens", newLimit);
          }
        }
      }
    } else {
      // Add it if it doesn't exist
      appendBetaHeader({ name, value });
      
      // If adding extended output flag, adjust maxTokens
      if (name === "anthropic-beta" && value === "output-128k-2025-02-19" && currentModel === "claude-3-7-sonnet-20240613") {
        const modelLimits = MODEL_TOKEN_LIMITS[currentModel as keyof typeof MODEL_TOKEN_LIMITS];
        if (modelLimits) {
          form.setValue("maxTokens", modelLimits.extendedLimit);
        }
      }
    }
  };

  // Check if a suggestion is active
  const isSuggestionActive = (name: string, value: string) => {
    return betaHeaderFields.some(
      field => field.name === name && field.value === value
    );
  };

  // Handle thinking mode toggle
  const handleThinkingToggle = (enabled: boolean) => {
    setIsThinkingEnabled(enabled);
    
    // If disabling thinking, reset thinking budget
    if (!enabled) {
      form.setValue("thinkingBudget", 0);
      
      // When disabling thinking, adjust maxTokens if needed
      const modelLimits = MODEL_TOKEN_LIMITS[currentModel as keyof typeof MODEL_TOKEN_LIMITS];
      if (modelLimits) {
        // Check if extended output flag is present
        const hasOutputFlag = betaHeaderFields.some(
          field => field.name === "anthropic-beta" && field.value === "output-128k-2025-02-19"
        );
        
        const newLimit = hasOutputFlag && currentModel === "claude-3-7-sonnet-20240613" 
          ? modelLimits.extendedLimit 
          : modelLimits.standardLimit;
        
        const currentMaxTokens = form.getValues("maxTokens");
        // Only adjust if current value exceeds the new limit
        if (currentMaxTokens > newLimit) {
          form.setValue("maxTokens", newLimit);
        }
      }
    } else {
      // Default thinking budget
      form.setValue("thinkingBudget", 5000);
      
      // When enabling thinking, check if 128k flag is enabled first
      const hasOutputFlag = betaHeaderFields.some(
        field => field.name === "anthropic-beta" && field.value === "output-128k-2025-02-19"
      );
      
      // If 128k flag is enabled, don't change maxTokens as it has priority
      if (!hasOutputFlag || currentModel !== "claude-3-7-sonnet-20240613") {
        // Only adjust maxTokens if 128k flag is not enabled
        const modelLimits = MODEL_TOKEN_LIMITS[currentModel as keyof typeof MODEL_TOKEN_LIMITS];
        if (modelLimits && modelLimits.supportsThinking) {
          form.setValue("maxTokens", modelLimits.thinkingLimit);
        }
      }
    }
  };

  async function onSubmit(data: BatchCreation) {
    try {
      // Validate token limits before submitting
      const maxOutput = Number(data.maxTokens) || 0;
      const thinkingBudget = isThinkingEnabled ? (Number(data.thinkingBudget) || 0) : 0;
      const totalTokens = maxOutput + thinkingBudget;
      
      if (totalTokens > tokenLimit) {
        return; // Prevent submission if token limit is exceeded
      }
      
      setIsSubmitting(true);
      
      // Add thinking budget to the request if enabled
      const finalData = {
        ...data,
        thinkingBudget: isThinkingEnabled ? data.thinkingBudget : undefined
      };
      
      const response = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create batch");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error creating batch:", error);
      // Handle error (show toast notification, etc.)
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Setup Section - Two column layout */}
      <div className="gap-8 grid grid-cols-1 md:grid-cols-2">
        {/* Left Column - Basic Information */}
        <Card className="p-6">
          <h3 className="mb-4 font-medium text-lg">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center mb-1">
                <Label htmlFor="name" className="font-medium">Batch Name</Label>
                <span className="ml-1 text-red-500">*</span>
              </div>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Enter a name for this batch"
                className={form.formState.errors.name ? "border-red-500" : ""}
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-red-500 text-sm">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center mb-1">
                <Label htmlFor="description" className="text-gray-700">Description</Label>
                <Badge variant="outline" className="bg-transparent ml-2 font-normal text-gray-500 text-xs">Optional</Badge>
              </div>
              <Input
                id="description"
                {...form.register("description")}
                placeholder="Enter a description"
              />
            </div>

            {/* System Prompt (Moved from model parameters) */}
            <div>
              <div className="flex items-center mb-1">
                <Label htmlFor="system" className="text-gray-700">System Prompt</Label>
                <Badge variant="outline" className="bg-transparent ml-2 font-normal text-gray-500 text-xs">Optional</Badge>
              </div>
              <Input
                id="system"
                {...form.register("system")}
                placeholder="Enter system prompt"
              />
            </div>
          </div>
        </Card>

        {/* Right Column - Model Parameters */}
        <Card className="p-6">
          <h3 className="mb-4 font-medium text-lg">Model Parameters</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="model" className="block mb-1 font-medium">Model</Label>
              <Select
                defaultValue={form.getValues("model")}
                onValueChange={(value) => {
                  const modelType = value as keyof typeof MODEL_TOKEN_LIMITS;
                  form.setValue("model", modelType);
                  
                  // When model changes, set maxTokens to the model's standard limit
                  const modelLimits = MODEL_TOKEN_LIMITS[modelType];
                  if (modelLimits) {
                    let newLimit = modelLimits.standardLimit;
                    
                    // Check if extended output or thinking is enabled
                    const hasOutputFlag = betaHeaderFields.some(
                      field => field.name === "anthropic-beta" && field.value === "output-128k-2025-02-19"
                    );
                    
                    // 128k flag takes precedence over thinking
                    if (hasOutputFlag && modelType === "claude-3-7-sonnet-20240613") {
                      newLimit = modelLimits.extendedLimit;
                    } else if (isThinkingEnabled && modelLimits.supportsThinking) {
                      newLimit = modelLimits.thinkingLimit;
                    }
                    
                    form.setValue("maxTokens", newLimit);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-3-7-sonnet-20240613">Claude 3.7 Sonnet</SelectItem>
                  <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Oct 2024)</SelectItem>
                  <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Oct 2024)</SelectItem>
                  <SelectItem value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (June 2024)</SelectItem>
                  <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                  <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                  <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="temperature" className="block mb-1 font-medium">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="1"
                {...form.register("temperature", { valueAsNumber: true })}
              />
              <p className="mt-1 text-gray-500 text-xs">Controls randomness (0-1)</p>
            </div>

            <div>
              <Label htmlFor="maxTokens" className="block mb-1 font-medium">Max Output</Label>
              <Input
                id="maxTokens"
                type="number"
                min="1"
                max={tokenLimit}
                className={tokenLimitExceeded ? "border-red-500" : ""}
                {...form.register("maxTokens", { valueAsNumber: true })}
              />
              <p className={`mt-1 text-xs ${tokenLimitExceeded ? "text-red-500 font-medium" : "text-gray-500"}`}>
                Limit: {tokenLimit.toLocaleString()} tokens
                {hasExtendedOutputFlag ? " (extended with 128k beta header)" : 
                isThinkingEnabled && currentModel === "claude-3-7-sonnet-20240613" ? " (extended with thinking mode)" : ""}
              </p>
              {tokenLimitExceeded && (
                <p className="mt-1 text-red-500 text-xs">
                  Total tokens exceed the limit
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Thinking Mode Card (Highlighted for Claude 3.7) */}
      {MODEL_TOKEN_LIMITS[currentModel as keyof typeof MODEL_TOKEN_LIMITS]?.supportsThinking && (
        <Card className="bg-blue-50/50 p-6 border-2 border-blue-100">
          <div className="flex items-start gap-3">
            <LightbulbIcon className="mt-1 w-5 h-5 text-blue-500" />
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <h3 className="font-medium text-blue-800">Thinking Mode</h3>
                  <p className="text-blue-700 text-sm">
                    Enable extended thinking for complex tasks with Claude 3.7 Sonnet
                  </p>
                </div>
                <Switch 
                  checked={isThinkingEnabled}
                  onCheckedChange={handleThinkingToggle}
                />
              </div>
              {isThinkingEnabled && (
                <div>
                  <Label htmlFor="thinkingBudget" className="block mb-1 text-blue-700 text-sm">Thinking Budget (tokens)</Label>
                  <Input
                    id="thinkingBudget"
                    type="number"
                    value={thinkingBudget}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setThinkingBudget(value);
                      form.setValue("thinkingBudget", value);
                    }}
                    min="5000"
                    max="100000"
                    step="1000"
                    className="mb-2"
                  />
                  <div className="text-blue-700 text-xs">
                    Recommended: 5,000-10,000 tokens. Allows Claude to work through complex problems step-by-step.
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Messages Section - Full Width */}
      <Card className="p-6 border-2 border-indigo-100">
        <div className="flex items-center mb-4">
          <h3 className="font-medium text-lg">Messages</h3>
          <Badge className="bg-indigo-100 hover:bg-indigo-200 ml-2 text-indigo-800">
            Required
          </Badge>
        </div>
        
        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="p-4 border border-gray-200">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Select
                    defaultValue={field.role}
                    onValueChange={(value) =>
                      form.setValue(`messages.${index}.role` as const, value as "user" | "assistant")
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="assistant">Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className={fields.length === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50 hover:text-red-500 hover:border-red-200"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  {...form.register(`messages.${index}.content`)}
                  placeholder="Enter message content"
                  className={form.formState.errors.messages?.[index]?.content ? "border-red-500" : ""}
                />
                {form.formState.errors.messages?.[index]?.content && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.messages[index]?.content?.message}
                  </p>
                )}
              </div>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ role: "user", content: "" })}
            className="bg-indigo-50 hover:bg-indigo-100 border-indigo-200 w-full text-indigo-700 hover:text-indigo-800"
          >
            <Plus className="mr-2 w-5 h-5" />
            Add Message
          </Button>
        </div>
      </Card>

      {/* Advanced Options - De-emphasized */}
      <Accordion type="single" collapsible className="bg-gray-50 border rounded-md w-full">
        <AccordionItem value="advanced-options" className="border-none">
          <AccordionTrigger className="px-6 py-4">
            <div className="flex items-center">
              <BeakerIcon className="mr-2 w-4 h-4 text-gray-500" />
              <span>Advanced Options</span>
              <Badge variant="outline" className="bg-gray-100 ml-3 text-xs">Experimental</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-6">
            <div className="space-y-6">
              <div>
                <div className="flex items-center mb-1">
                  <Label htmlFor="anthropicVersion" className="text-gray-700">Anthropic API Version</Label>
                  <Badge variant="outline" className="bg-transparent ml-2 font-normal text-gray-500 text-xs">Optional</Badge>
                </div>
                <Input
                  id="anthropicVersion"
                  {...form.register("anthropicVersion")}
                  placeholder="e.g., 2023-06-01"
                />
                <p className="mt-1 text-gray-500 text-xs">
                  Specify the Anthropic API version to use. Leave empty for default.
                </p>
              </div>

              <Separator className="my-4" />

              <div>
                <div className="mb-3">
                  <Label className="block mb-1 text-gray-700">Beta Features</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {BETA_HEADER_SUGGESTIONS.map((suggestion) => {
                      // Skip suggestions that are restricted to specific models
                      const isRestricted = suggestion.modelRestriction && 
                                          suggestion.modelRestriction !== currentModel;
                      if (isRestricted) return null;
                      
                      const isActive = isSuggestionActive(suggestion.name, suggestion.value);
                      return (
                        <Badge 
                          key={suggestion.value}
                          variant={isActive ? "default" : "outline"}
                          className={`cursor-pointer ${isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : "hover:bg-gray-100"}`}
                          onClick={() => addBetaHeaderSuggestion(suggestion.name, suggestion.value)}
                        >
                          {isActive && <Check className="mr-1 w-3 h-3" />}
                          {suggestion.value}
                        </Badge>
                      );
                    })}
                  </div>
                  <p className="text-gray-500 text-xs">
                    Click on a beta feature to enable/disable it
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-gray-700">Custom Beta Headers</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendBetaHeader({ name: "", value: "" })}
                      className="text-xs"
                    >
                      <Plus className="mr-1 w-3.5 h-3.5" />
                      Add Header
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {betaHeaderFields.map((field, index) => (
                      <Card key={field.id} className="bg-white p-3">
                        <div className="gap-2 grid grid-cols-[1fr_1fr_auto]">
                          <div>
                            <Label htmlFor={`betaHeaders.${index}.name`} className="text-xs">
                              Header Name
                            </Label>
                            <Input
                              id={`betaHeaders.${index}.name`}
                              {...form.register(`betaHeaders.${index}.name`)}
                              placeholder="e.g., anthropic-beta"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`betaHeaders.${index}.value`} className="text-xs">
                              Header Value
                            </Label>
                            <Input
                              id={`betaHeaders.${index}.value`}
                              {...form.register(`betaHeaders.${index}.value`)}
                              placeholder="e.g., tools-2023-11"
                              className="text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="self-end hover:bg-red-50 p-0 w-8 h-8 hover:text-red-500"
                            onClick={() => removeBetaHeader(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                    {betaHeaderFields.length === 0 && (
                      <p className="bg-gray-50 p-3 rounded-md text-gray-500 text-sm">
                        No beta headers added. Add headers to enable Anthropic beta features.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Action Buttons - Right Aligned */}
      <div className="flex justify-end gap-4 mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="px-6"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || tokenLimitExceeded}
          className={`px-8 py-2 ${tokenLimitExceeded ? "bg-gray-300" : "bg-primary"}`}
        >
          {isSubmitting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
          Create Batch
        </Button>
      </div>
    </form>
  );
}
