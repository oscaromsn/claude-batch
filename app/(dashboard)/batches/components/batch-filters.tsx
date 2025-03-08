"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, X } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function BatchFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get initial filter values from URL
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [model, setModel] = useState(searchParams.get("model") || "all");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined
  );

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (status && status !== "all") {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    
    if (model && model !== "all") {
      params.set("model", model);
    } else {
      params.delete("model");
    }
    
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    
    if (dateFrom) {
      params.set("dateFrom", dateFrom.toISOString().split("T")[0]);
    } else {
      params.delete("dateFrom");
    }
    
    if (dateTo) {
      params.set("dateTo", dateTo.toISOString().split("T")[0]);
    } else {
      params.delete("dateTo");
    }
    
    router.push(`/batches?${params.toString()}`);
  }, [status, model, search, dateFrom, dateTo, router, searchParams]);

  // Reset all filters
  const resetFilters = () => {
    setStatus("all");
    setModel("all");
    setSearch("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = status !== "all" || model !== "all" || search || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      <div className="flex sm:flex-row flex-col gap-4">
        {/* Search by name or description */}
        <div className="w-full sm:max-w-[300px]">
          <Input
            placeholder="Search batches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        
        {/* Status filter */}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="CANCELED">Canceled</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Model filter */}
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All models</SelectItem>
            <SelectItem value="claude-3-7-sonnet-20240613">Claude 3.7 Sonnet</SelectItem>
            <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
            <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
            <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
            <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
            <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Date range filters */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal sm:w-[180px]",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 w-4 h-4" />
                {dateFrom ? format(dateFrom, "PPP") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto">
              <CalendarComponent
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal sm:w-[180px]",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 w-4 h-4" />
                {dateTo ? format(dateTo, "PPP") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto">
              <CalendarComponent
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Reset filters button */}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={resetFilters} className="gap-1">
            <X className="w-4 h-4" />
            Clear filters
          </Button>
        )}
      </div>
      
      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {status !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Status: {status.replace(/_/g, " ")}
              <button 
                className="hover:bg-muted ml-1 rounded-full"
                onClick={() => setStatus("all")}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {model !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Model: {model.split("-").slice(0, 3).join(" ")}
              <button 
                className="hover:bg-muted ml-1 rounded-full"
                onClick={() => setModel("all")}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {dateFrom && (
            <Badge variant="secondary" className="text-xs">
              From: {format(dateFrom, "PP")}
              <button 
                className="hover:bg-muted ml-1 rounded-full"
                onClick={() => setDateFrom(undefined)}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {dateTo && (
            <Badge variant="secondary" className="text-xs">
              To: {format(dateTo, "PP")}
              <button 
                className="hover:bg-muted ml-1 rounded-full"
                onClick={() => setDateTo(undefined)}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {search && (
            <Badge variant="secondary" className="text-xs">
              Search: {search}
              <button 
                className="hover:bg-muted ml-1 rounded-full"
                onClick={() => setSearch("")}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
} 