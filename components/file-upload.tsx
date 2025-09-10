"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface FileUploadProps {
  onUpload: (data: any) => void
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>("")
  const [progress, setProgress] = useState<number>(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    // Simulate file processing
    setTimeout(() => {
      setUploadedFile(file.name)
      setIsUploading(false)
      onUpload({
        fileName: file.name,
        uploadDate: new Date(),
        data: "mock_data", // In real implementation, parse the Excel/CSV file
      })
    }, 2000)
  }

  const handleRefreshFromSpreadsheet = async () => {
    if (!spreadsheetUrl) return

    setIsUploading(true)
    setProgress(0)

    try {
      // Extract spreadsheet ID from URL
      const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)

      // Google Sheets API call simulation
      const response = await fetch(`/api/sheets/${spreadsheetId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("スプレッドシートの取得に失敗しました")
      }

      const data = await response.json()

      // Progress simulation
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setIsUploading(false)
            setUploadStatus("success")
            onUpload(data) // Pass the fetched data to the onUpload function
            return 100
          }
          return prev + 15
        })
      }, 150)
    } catch (error) {
      setIsUploading(false)
      setUploadStatus("error")
      console.error("Error fetching spreadsheet:", error)
    }
  }

  const extractSpreadsheetId = (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : null
  }

  const onDataUploaded = () => {
    // Handle successful data upload, e.g., show a success message
    console.log("Data uploaded successfully!")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {uploadedFile ? (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="flex items-center gap-2 p-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">{uploadedFile}</span>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  処理中...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  スプレッドシート更新
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <div>
        <Input
          type="url"
          placeholder="Google スプレッドシートのURL"
          value={spreadsheetUrl}
          onChange={(e) => setSpreadsheetUrl(e.target.value)}
          disabled={isUploading}
        />
        <Button onClick={handleRefreshFromSpreadsheet} disabled={isUploading || !spreadsheetUrl} className="mt-2">
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              更新中... ({progress}%)
            </>
          ) : (
            "Google スプレッドシートから更新"
          )}
        </Button>
        {uploadStatus === "error" && <p className="text-red-500 mt-2">スプレッドシートの更新に失敗しました。</p>}
        {uploadStatus === "success" && <p className="text-green-500 mt-2">スプレッドシートの更新に成功しました。</p>}
      </div>
    </div>
  )
}
