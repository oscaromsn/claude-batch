"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    AlertTriangle,
    BeakerIcon,
    Check,
    LightbulbIcon,
    Loader2,
    Plus,
    Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    BETA_HEADERS,
    CLAUDE_MODELS,
    DEFAULT_MODEL,
    MODEL_TOKEN_LIMITS,
} from "@/lib/constants/models";
import {
    type BatchCreation,
    batchCreationSchema,
} from "@/lib/validation/batch.schema";

// Beta headers suggestions with descriptions
const BETA_HEADER_SUGGESTIONS = [
    BETA_HEADERS.OUTPUT_128K,
    {
        name: "anthropic-beta",
        value: "computer-use-2025-01-24",
        description:
            "Enables computer use capabilities (Claude 3.5 Sonnet only)",
        modelRestriction: undefined,
    },
];

export default function BatchCreationForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tokenLimitExceeded, setTokenLimitExceeded] = useState(false);
    const [thinkingBudget, setThinkingBudget] = useState(5000);
    const [thinkingBudgetExceedsMax, setThinkingBudgetExceedsMax] =
        useState(false);
    const defaultModel = DEFAULT_MODEL;
    const defaultModelLimits = MODEL_TOKEN_LIMITS[defaultModel];
    const [tokenLimit, setTokenLimit] = useState<number>(
        defaultModelLimits.standardLimit,
    );
    const [currentModel, setCurrentModel] = useState<string>(defaultModel);
    const [temperatureValue, setTemperatureValue] = useState(0.7);
    const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
    const [hasExtendedOutputFlag, setHasExtendedOutputFlag] = useState(false);

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
            thinkingEnabled: false,
            thinkingBudget: 5000,
        },
        mode: "onChange",
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "messages",
    });

    const {
        fields: betaHeaderFields,
        append: appendBetaHeader,
        remove: removeBetaHeader,
    } = useFieldArray({
        control: form.control,
        name: "betaHeaders",
    });

    // Function to validate token limits - wrapped in useCallback to avoid dependency changes
    const validateTokenLimits = useCallback(() => {
        const maxOutput = Number(form.getValues("maxTokens")) || 0;

        // Get the current model and its limits
        const modelType = form.getValues("model");
        const modelLimits =
            MODEL_TOKEN_LIMITS[modelType as keyof typeof MODEL_TOKEN_LIMITS];

        if (!modelLimits) return;

        // Check if the extended output flag is present
        const betaHeaders = form.getValues("betaHeaders");
        const hasOutputFlag = betaHeaders.some(
            (field) =>
                field.name === "anthropic-beta" &&
                field.value === "output-128k-2025-02-19",
        );
        setHasExtendedOutputFlag(hasOutputFlag);

        // Check if thinking mode is enabled
        const thinkingEnabled = form.getValues("thinkingEnabled");

        // Calculate effective token limit
        let effectiveLimit = modelLimits.standardLimit;

        if (hasOutputFlag && modelType === CLAUDE_MODELS.SONNET_3_7) {
            effectiveLimit = modelLimits.extendedLimit || effectiveLimit;
        } else if (thinkingEnabled && modelLimits.supportsThinking) {
            effectiveLimit = modelLimits.thinkingLimit || effectiveLimit;
        }

        // Check if maxTokens exceeds the limit
        const isExceeded = maxOutput > effectiveLimit;
        setTokenLimitExceeded(isExceeded);

        // Check thinking budget
        if (thinkingEnabled) {
            const budget = Number(form.getValues("thinkingBudget")) || 0;
            const maxBudget = modelLimits.thinkingLimit || 100000;
            setThinkingBudgetExceedsMax(budget > maxBudget);
        }
    }, [form]);

    // Function to update token limit - wrapped in useCallback to avoid dependency changes
    const updateTokenLimit = useCallback(
        (
            selectedModel: string,
            hasOutputFlag: boolean,
            thinkingEnabled: boolean,
        ) => {
            // Update current model state
            setCurrentModel(selectedModel);

            const modelLimits =
                MODEL_TOKEN_LIMITS[
                    selectedModel as keyof typeof MODEL_TOKEN_LIMITS
                ];
            if (!modelLimits) return;

            let limit: number;
            if (hasOutputFlag && selectedModel === CLAUDE_MODELS.SONNET_3_7) {
                limit = modelLimits.extendedLimit;
            } else if (thinkingEnabled && modelLimits.supportsThinking) {
                limit = modelLimits.thinkingLimit || modelLimits.standardLimit;
            } else {
                limit = modelLimits.standardLimit;
            }

            setTokenLimit(limit);

            // Check if current maxTokens exceeds the new limit
            const currentMaxTokens = form.getValues("maxTokens");
            if (currentMaxTokens > limit) {
                form.setValue("maxTokens", limit);
            } else if (
                hasOutputFlag &&
                selectedModel === CLAUDE_MODELS.SONNET_3_7 &&
                currentMaxTokens < limit
            ) {
                // If enabling 128k flag, bump up maxTokens to the extended limit
                form.setValue("maxTokens", limit);
            }

            // Validate token limits
            validateTokenLimits();
        },
        [form, validateTokenLimits],
    );

    // Effect to update token limit when model or beta headers change
    useEffect(() => {
        const selectedModel = form.getValues("model");
        const betaHeaders = form.getValues("betaHeaders");

        // Check if the 128k output flag is enabled
        const hasOutputFlag = betaHeaders.some(
            (field) =>
                field.name === "anthropic-beta" &&
                field.value === "output-128k-2025-02-19",
        );

        // Check if thinking mode is enabled
        const thinkingEnabled = form.getValues("thinkingEnabled") as boolean;

        updateTokenLimit(selectedModel, hasOutputFlag, thinkingEnabled);
    }, [form, updateTokenLimit]);

    // Effect to validate token limits when form changes
    useEffect(() => {
        // Create a subscription to watch for changes to messages and maxTokens
        const subscription = form.watch(() => {
            validateTokenLimits();
        });

        // Initial validation
        validateTokenLimits();

        // Cleanup subscription
        return () => subscription.unsubscribe();
    }, [form, validateTokenLimits]);

    // Listen for temperature changes from the form
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === "temperature" && value.temperature !== undefined) {
                setTemperatureValue(value.temperature as number);
            }
        });
        return () => subscription.unsubscribe();
    }, [form]);

    // Add beta header suggestion
    const addBetaHeaderSuggestion = (name: string, value: string) => {
        // Check if this header already exists
        const existingIndex = betaHeaderFields.findIndex(
            (field) => field.name === name && field.value === value,
        );

        if (existingIndex >= 0) {
            // Remove it if it exists
            removeBetaHeader(existingIndex);

            // If removing extended output flag, adjust maxTokens if needed
            if (
                name === "anthropic-beta" &&
                value === "output-128k-2025-02-19"
            ) {
                const modelLimits =
                    MODEL_TOKEN_LIMITS[
                        currentModel as keyof typeof MODEL_TOKEN_LIMITS
                    ];
                if (modelLimits) {
                    const newLimit =
                        isThinkingEnabled && modelLimits.supportsThinking
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
            if (
                name === "anthropic-beta" &&
                value === "output-128k-2025-02-19" &&
                currentModel === CLAUDE_MODELS.SONNET_3_7
            ) {
                const modelLimits =
                    MODEL_TOKEN_LIMITS[
                        currentModel as keyof typeof MODEL_TOKEN_LIMITS
                    ];
                if (modelLimits?.extendedLimit) {
                    form.setValue("maxTokens", modelLimits.extendedLimit);
                }
            }
        }
    };

    // Check if a suggestion is active
    const isSuggestionActive = (name: string, value: string) => {
        return betaHeaderFields.some(
            (field) => field.name === name && field.value === value,
        );
    };

    // Toggle thinking mode
    const toggleThinkingMode = (enabled: boolean) => {
        setIsThinkingEnabled(enabled);
        form.setValue("thinkingEnabled", enabled);

        // Update token limits based on thinking mode
        const modelType = form.getValues("model");
        const modelLimits =
            MODEL_TOKEN_LIMITS[modelType as keyof typeof MODEL_TOKEN_LIMITS];

        // Don't change limits if model doesn't support thinking
        if (!modelLimits || !modelLimits.supportsThinking) {
            return;
        }

        // Check if 128k flag is enabled
        const betaHeaders = form.getValues("betaHeaders");
        const hasOutputFlag = betaHeaders.some(
            (field) =>
                field.name === "anthropic-beta" &&
                field.value === "output-128k-2025-02-19",
        );

        // If 128k flag is enabled, don't change maxTokens as it has priority
        if (!hasOutputFlag || modelType !== CLAUDE_MODELS.SONNET_3_7) {
            // Only adjust maxTokens if 128k flag is not enabled
            const modelLimits =
                MODEL_TOKEN_LIMITS[
                    modelType as keyof typeof MODEL_TOKEN_LIMITS
                ];
            if (modelLimits?.supportsThinking) {
                const newLimit = enabled
                    ? modelLimits.thinkingLimit
                    : modelLimits.standardLimit;
                setTokenLimit(newLimit);

                // If current maxTokens exceeds the new limit, update it
                const currentMaxTokens = form.getValues("maxTokens");
                if (currentMaxTokens > newLimit) {
                    form.setValue("maxTokens", newLimit);
                }
            }
        }

        validateTokenLimits();
    };

    async function onSubmit(data: BatchCreation) {
        try {
            // Validate that all messages have content
            const emptyMessages = data.messages.filter(
                (msg) => !msg.content || msg.content.trim() === "",
            );
            if (emptyMessages.length > 0) {
                // Highlight the empty message fields
                emptyMessages.forEach((_, index) => {
                    form.setError(`messages.${index}.content` as const, {
                        type: "manual",
                        message: "Message content is required",
                    });
                });
                return; // Prevent submission if any message is empty
            }

            // Validate token limits before submitting
            const maxOutput = Number(data.maxTokens) || 0;

            // Get the appropriate limit based on model and enabled features
            const modelLimits =
                MODEL_TOKEN_LIMITS[
                    data.model as keyof typeof MODEL_TOKEN_LIMITS
                ];
            let effectiveLimit = modelLimits?.standardLimit || tokenLimit;

            // 128k flag takes precedence
            const hasOutputFlag = data.betaHeaders.some(
                (header) =>
                    header.name === "anthropic-beta" &&
                    header.value === "output-128k-2025-02-19",
            );

            if (hasOutputFlag && data.model === CLAUDE_MODELS.SONNET_3_7) {
                effectiveLimit = modelLimits?.extendedLimit ?? effectiveLimit;
            } else if (isThinkingEnabled && modelLimits?.supportsThinking) {
                effectiveLimit = modelLimits?.thinkingLimit ?? effectiveLimit;
            }

            if (maxOutput > effectiveLimit) {
                return; // Prevent submission if token limit is exceeded
            }

            setIsSubmitting(true);

            // Add thinking budget to the request if enabled
            const finalData = {
                ...data,
                thinkingBudget: isThinkingEnabled
                    ? data.thinkingBudget
                    : undefined,
            };

            const response = await fetch("/api/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(finalData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API error details:", errorData);
                throw new Error(
                    errorData.message ||
                        errorData.error ||
                        "Failed to create batch",
                );
            }

            router.push("/batches");
            router.refresh();
        } catch (error) {
            console.error("Error creating batch:", error);
            // Show error to user
            alert(
                `Error creating batch: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Setup Section - Two column layout */}
            <div className="gap-8 grid grid-cols-1 md:grid-cols-2">
                {/* Left Column - Basic Information */}
                <Card className="p-6 border dark:border-gray-800">
                    <h3 className="mb-4 font-medium text-lg">
                        Basic Information
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center mb-1">
                                <Label
                                    htmlFor="name"
                                    className="font-medium text-foreground"
                                >
                                    Batch Name
                                </Label>
                                <span className="ml-1 text-red-500">*</span>
                            </div>
                            <Input
                                id="name"
                                {...form.register("name")}
                                placeholder="Enter a name for this batch"
                                className={
                                    form.formState.errors.name
                                        ? "border-red-500"
                                        : ""
                                }
                            />
                            {form.formState.errors.name && (
                                <p className="mt-1 text-red-500 text-sm">
                                    {form.formState.errors.name.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center mb-1">
                                <Label
                                    htmlFor="description"
                                    className="text-foreground"
                                >
                                    Description
                                </Label>
                                <Badge
                                    variant="outline"
                                    className="bg-transparent ml-2 font-normal text-muted-foreground text-xs"
                                >
                                    Optional
                                </Badge>
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
                                <Label
                                    htmlFor="system"
                                    className="text-foreground"
                                >
                                    System Prompt
                                </Label>
                                <Badge
                                    variant="outline"
                                    className="bg-transparent ml-2 font-normal text-muted-foreground text-xs"
                                >
                                    Optional
                                </Badge>
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
                <Card className="p-6 border dark:border-gray-800">
                    <h3 className="mb-4 font-medium text-lg">
                        Model Parameters
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <Label
                                htmlFor="model"
                                className="block mb-1 font-medium"
                            >
                                Model
                            </Label>
                            <Select
                                defaultValue={form.getValues("model")}
                                onValueChange={(value) => {
                                    const modelType =
                                        value as keyof typeof MODEL_TOKEN_LIMITS;
                                    form.setValue("model", modelType);

                                    // When model changes, set maxTokens to the model's standard limit
                                    const modelLimits =
                                        MODEL_TOKEN_LIMITS[modelType];
                                    if (modelLimits) {
                                        let newLimit =
                                            modelLimits.standardLimit;

                                        // Check if extended output or thinking is enabled
                                        const hasOutputFlag =
                                            betaHeaderFields.some(
                                                (field) =>
                                                    field.name ===
                                                        "anthropic-beta" &&
                                                    field.value ===
                                                        "output-128k-2025-02-19",
                                            );

                                        // 128k flag takes precedence over thinking
                                        if (
                                            hasOutputFlag &&
                                            modelType ===
                                                CLAUDE_MODELS.SONNET_3_7
                                        ) {
                                            newLimit =
                                                modelLimits.extendedLimit;
                                        } else if (
                                            isThinkingEnabled &&
                                            modelLimits.supportsThinking
                                        ) {
                                            newLimit =
                                                modelLimits.thinkingLimit;
                                        }

                                        setTokenLimit(newLimit);
                                        form.setValue(
                                            "maxTokens",
                                            Math.min(newLimit, 128000),
                                        );
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={CLAUDE_MODELS.OPUS_4}>
                                        Claude Opus 4
                                    </SelectItem>
                                    <SelectItem value={CLAUDE_MODELS.SONNET_4}>
                                        Claude Sonnet 4
                                    </SelectItem>
                                    <SelectItem
                                        value={CLAUDE_MODELS.SONNET_3_7}
                                    >
                                        Claude 3.7 Sonnet
                                    </SelectItem>
                                    <SelectItem
                                        value={CLAUDE_MODELS.SONNET_3_5_V2}
                                    >
                                        Claude 3.5 Sonnet (Oct 2024)
                                    </SelectItem>
                                    <SelectItem value={CLAUDE_MODELS.HAIKU_3_5}>
                                        Claude 3.5 Haiku (Oct 2024)
                                    </SelectItem>
                                    <SelectItem
                                        value={CLAUDE_MODELS.SONNET_3_5}
                                    >
                                        Claude 3.5 Sonnet (June 2024)
                                    </SelectItem>
                                    <SelectItem value={CLAUDE_MODELS.OPUS_3}>
                                        Claude 3 Opus
                                    </SelectItem>
                                    <SelectItem value={CLAUDE_MODELS.SONNET_3}>
                                        Claude 3 Sonnet
                                    </SelectItem>
                                    <SelectItem value={CLAUDE_MODELS.HAIKU_3}>
                                        Claude 3 Haiku
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label
                                htmlFor="temperature"
                                className="block mb-1 font-medium"
                            >
                                Temperature
                            </Label>
                            <div className="flex flex-col space-y-2">
                                <div className="flex items-center space-x-2">
                                    <span className="text-muted-foreground text-xs">
                                        0
                                    </span>
                                    <div className="relative flex-1">
                                        <input
                                            id="temperature-slider"
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={temperatureValue}
                                            onChange={(e) => {
                                                const value = Number.parseFloat(
                                                    e.target.value,
                                                );
                                                setTemperatureValue(value);
                                                form.setValue(
                                                    "temperature",
                                                    value,
                                                );
                                            }}
                                            className="bg-secondary rounded-lg w-full h-2 accent-primary appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <span className="text-muted-foreground text-xs">
                                        1
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="1"
                                        value={temperatureValue}
                                        onChange={(e) => {
                                            const value = Number.parseFloat(
                                                e.target.value,
                                            );
                                            setTemperatureValue(value);
                                            form.setValue("temperature", value);
                                        }}
                                        className="w-16 h-8 text-xs text-center"
                                    />
                                </div>
                                <div className="mt-1 text-muted-foreground text-sm">
                                    <p className="text-xs">
                                        Controls randomness in the response:
                                    </p>
                                    <ul className="mt-1 pl-4 text-xs list-disc">
                                        <li>
                                            <strong>
                                                Lower values (0-0.3):
                                            </strong>{" "}
                                            More focused, deterministic
                                            responses
                                        </li>
                                        <li>
                                            <strong>
                                                Medium values (0.4-0.7):
                                            </strong>{" "}
                                            Balanced creativity and coherence
                                        </li>
                                        <li>
                                            <strong>
                                                Higher values (0.8-1.0):
                                            </strong>{" "}
                                            More diverse and creative outputs
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label
                                htmlFor="maxTokens"
                                className="block mb-1 font-medium"
                            >
                                Max Output
                            </Label>
                            <Input
                                id="maxTokens"
                                type="number"
                                min="1"
                                max={tokenLimit}
                                className={
                                    tokenLimitExceeded ? "border-red-500" : ""
                                }
                                {...form.register("maxTokens", {
                                    valueAsNumber: true,
                                    onChange: () => {
                                        validateTokenLimits();
                                    },
                                })}
                            />
                            <p
                                className={`mt-1 text-xs ${tokenLimitExceeded ? "text-red-500 font-medium" : "text-muted-foreground"}`}
                            >
                                Limit: {tokenLimit.toLocaleString()} tokens
                                {hasExtendedOutputFlag
                                    ? " (extended with 128k beta header)"
                                    : isThinkingEnabled &&
                                        (currentModel ===
                                            CLAUDE_MODELS.SONNET_3_7 ||
                                            currentModel ===
                                                CLAUDE_MODELS.OPUS_4 ||
                                            currentModel ===
                                                CLAUDE_MODELS.SONNET_4)
                                      ? " (extended with thinking mode)"
                                      : ""}
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
            {MODEL_TOKEN_LIMITS[currentModel as keyof typeof MODEL_TOKEN_LIMITS]
                ?.supportsThinking && (
                <Card className="bg-blue-50/10 dark:bg-blue-950/20 p-6 border-2 border-blue-100 dark:border-blue-900">
                    <div className="flex items-start gap-3">
                        <LightbulbIcon className="mt-1 w-5 h-5 text-blue-500 dark:text-blue-400" />
                        <div className="flex-1 space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="space-y-0.5">
                                    <h3 className="font-medium text-blue-800 dark:text-blue-300">
                                        Thinking Mode
                                    </h3>
                                    <p className="text-blue-700 dark:text-blue-400 text-sm">
                                        Enable extended thinking for complex
                                        tasks with Claude 3.7 Sonnet
                                    </p>
                                </div>
                                <Switch
                                    checked={isThinkingEnabled}
                                    onCheckedChange={toggleThinkingMode}
                                />
                            </div>
                            {isThinkingEnabled && (
                                <div>
                                    <Label
                                        htmlFor="thinkingBudget"
                                        className="block mb-1 text-blue-700 dark:text-blue-400 text-sm"
                                    >
                                        Thinking Budget (tokens)
                                    </Label>
                                    <Input
                                        id="thinkingBudget"
                                        type="number"
                                        value={thinkingBudget}
                                        onChange={(e) => {
                                            const value =
                                                Number.parseInt(
                                                    e.target.value,
                                                    10,
                                                ) || 0;
                                            setThinkingBudget(value);
                                            form.setValue(
                                                "thinkingBudget",
                                                value,
                                            );
                                            validateTokenLimits();
                                        }}
                                        min="5000"
                                        max={
                                            hasExtendedOutputFlag &&
                                            currentModel ===
                                                CLAUDE_MODELS.SONNET_3_7
                                                ? "128000"
                                                : currentModel ===
                                                    CLAUDE_MODELS.SONNET_4
                                                  ? "64000"
                                                  : "100000"
                                        }
                                        className={
                                            thinkingBudgetExceedsMax
                                                ? "border-amber-500"
                                                : ""
                                        }
                                        step="1000"
                                    />
                                    {thinkingBudgetExceedsMax && (
                                        <p className="flex items-center mt-1 text-amber-600 text-sm">
                                            <AlertTriangle className="mr-1 w-4 h-4" />
                                            Thinking budget cannot exceed max
                                            output tokens
                                        </p>
                                    )}
                                    <div className="mt-1 text-blue-700 dark:text-blue-400 text-xs">
                                        Recommended: 5,000-10,000 tokens. Allows
                                        Claude to work through complex problems
                                        step-by-step.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* Messages Section - Full Width */}
            <Card className="p-6 border-2 border-indigo-100 dark:border-indigo-900">
                <div className="flex items-center mb-4">
                    <h3 className="font-medium text-lg">Messages</h3>
                    <Badge className="bg-indigo-100 hover:bg-indigo-200 dark:hover:bg-indigo-800 dark:bg-indigo-900 ml-2 text-indigo-800 dark:text-indigo-300">
                        Required
                    </Badge>
                </div>

                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <Card
                            key={field.id}
                            className="p-4 border border-gray-200 dark:border-gray-800"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Select
                                        defaultValue={field.role}
                                        onValueChange={(value) =>
                                            form.setValue(
                                                `messages.${index}.role` as const,
                                                value as "user" | "assistant",
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">
                                                User
                                            </SelectItem>
                                            <SelectItem value="assistant">
                                                Assistant
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => remove(index)}
                                        disabled={fields.length === 1}
                                        className={
                                            fields.length === 1
                                                ? "opacity-50 cursor-not-allowed"
                                                : "hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                                        }
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Input
                                    {...form.register(
                                        `messages.${index}.content`,
                                        {
                                            onChange: (e) => {
                                                form.setValue(
                                                    `messages.${index}.content`,
                                                    e.target.value,
                                                );
                                            },
                                        },
                                    )}
                                    placeholder="Enter message content"
                                    className={
                                        form.formState.errors.messages?.[index]
                                            ?.content
                                            ? "border-red-500"
                                            : ""
                                    }
                                />
                                {form.formState.errors.messages?.[index]
                                    ?.content && (
                                    <p className="text-red-500 text-sm">
                                        {
                                            form.formState.errors.messages[
                                                index
                                            ]?.content?.message
                                        }
                                    </p>
                                )}
                            </div>
                        </Card>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ role: "user", content: "" })}
                        className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 border-indigo-200 dark:border-indigo-800 w-full text-indigo-700 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200"
                    >
                        <Plus className="mr-2 w-5 h-5" />
                        Add Message
                    </Button>
                </div>
            </Card>

            {/* Advanced Options - De-emphasized */}
            <Accordion
                type="single"
                collapsible
                className="bg-gray-50 dark:bg-gray-900 border rounded-md w-full"
            >
                <AccordionItem value="advanced-options" className="border-none">
                    <AccordionTrigger className="px-6 py-4">
                        <div className="flex items-center">
                            <BeakerIcon className="mr-2 w-4 h-4 text-muted-foreground" />
                            <span>Advanced Options</span>
                            <Badge
                                variant="outline"
                                className="bg-gray-100 dark:bg-gray-800 ml-3 text-xs"
                            >
                                Experimental
                            </Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pt-2 pb-6">
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center mb-1">
                                    <Label
                                        htmlFor="anthropicVersion"
                                        className="text-foreground"
                                    >
                                        Anthropic API Version
                                    </Label>
                                    <Badge
                                        variant="outline"
                                        className="bg-transparent ml-2 font-normal text-muted-foreground text-xs"
                                    >
                                        Optional
                                    </Badge>
                                </div>
                                <Input
                                    id="anthropicVersion"
                                    {...form.register("anthropicVersion")}
                                    placeholder="e.g., 2023-06-01"
                                />
                                <p className="mt-1 text-muted-foreground text-xs">
                                    Specify the Anthropic API version to use.
                                    Leave empty for default.
                                </p>
                            </div>

                            <Separator className="my-4" />

                            <div>
                                <div className="mb-3">
                                    <Label className="block mb-1 text-foreground">
                                        Beta Features
                                    </Label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {BETA_HEADER_SUGGESTIONS.map(
                                            (suggestion) => {
                                                // Skip suggestions that are restricted to specific models
                                                const isRestricted =
                                                    suggestion.modelRestriction &&
                                                    suggestion.modelRestriction !==
                                                        currentModel;
                                                if (isRestricted) return null;

                                                const isActive =
                                                    isSuggestionActive(
                                                        suggestion.name,
                                                        suggestion.value,
                                                    );
                                                return (
                                                    <Badge
                                                        key={suggestion.value}
                                                        variant={
                                                            isActive
                                                                ? "default"
                                                                : "outline"
                                                        }
                                                        className={`cursor-pointer ${isActive ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                                                        onClick={() =>
                                                            addBetaHeaderSuggestion(
                                                                suggestion.name,
                                                                suggestion.value,
                                                            )
                                                        }
                                                    >
                                                        {isActive && (
                                                            <Check className="mr-1 w-3 h-3" />
                                                        )}
                                                        {suggestion.value}
                                                    </Badge>
                                                );
                                            },
                                        )}
                                    </div>
                                    <p className="text-muted-foreground text-xs">
                                        Click on a beta feature to
                                        enable/disable it
                                    </p>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <Label className="text-foreground">
                                            Custom Beta Headers
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                appendBetaHeader({
                                                    name: "",
                                                    value: "",
                                                })
                                            }
                                            className="text-xs"
                                        >
                                            <Plus className="mr-1 w-3.5 h-3.5" />
                                            Add Header
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {betaHeaderFields.map(
                                            (field, index) => (
                                                <Card
                                                    key={field.id}
                                                    className="bg-white dark:bg-gray-900 p-3 border dark:border-gray-800"
                                                >
                                                    <div className="gap-2 grid grid-cols-[1fr_1fr_auto]">
                                                        <div>
                                                            <Label
                                                                htmlFor={`betaHeaders.${index}.name`}
                                                                className="text-xs text-foreground"
                                                            >
                                                                Header Name
                                                            </Label>
                                                            <Input
                                                                id={`betaHeaders.${index}.name`}
                                                                {...form.register(
                                                                    `betaHeaders.${index}.name`,
                                                                )}
                                                                placeholder="e.g., anthropic-beta"
                                                                className="text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label
                                                                htmlFor={`betaHeaders.${index}.value`}
                                                                className="text-xs text-foreground"
                                                            >
                                                                Header Value
                                                            </Label>
                                                            <Input
                                                                id={`betaHeaders.${index}.value`}
                                                                {...form.register(
                                                                    `betaHeaders.${index}.value`,
                                                                )}
                                                                placeholder="e.g., tools-2023-11"
                                                                className="text-sm"
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="self-end hover:bg-red-50 dark:hover:bg-red-950/30 p-0 w-8 h-8 hover:text-red-500 dark:hover:text-red-400"
                                                            onClick={() =>
                                                                removeBetaHeader(
                                                                    index,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </Card>
                                            ),
                                        )}
                                        {betaHeaderFields.length === 0 && (
                                            <p className="bg-secondary/50 p-3 rounded-md text-muted-foreground text-sm">
                                                No beta headers added. Add
                                                headers to enable Anthropic beta
                                                features.
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
                    className={`px-8 py-2 ${tokenLimitExceeded ? "bg-gray-300 dark:bg-gray-700" : "bg-primary"}`}
                >
                    {isSubmitting && (
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    )}
                    Create Batch
                </Button>
            </div>
        </form>
    );
}
