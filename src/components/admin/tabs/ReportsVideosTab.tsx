import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Video,
  TrendingUp,
  TrendingDown,
  Play,
  Calendar,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getUserReports } from '@/services/adminService';

export function ReportsVideosTab({ user }) {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Fetch reports when user changes
  useEffect(() => {
    const fetchReports = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await getUserReports(user.id);
        const apiReports = response.data.data?.reports || [];
        
        // Transform API reports to match UI structure
        const transformedReports = apiReports.map((report) => ({
          id: report.interview_id,
          date: formatDate(report.generated_at),
          type: 'AI Mock Interview Report',
          summary: report.feedback_summary || '',
          readinessImpact: Math.round((report.score_overall || 0) * 100),
          scores: transformScores(report.scores),
          strengths: report.strengths || [],
          weaknesses: report.areas_for_improvement || [],
          recommendations: report.recommendations ? [report.recommendations] : [],
        }));

        setReports(transformedReports);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
        setError('Failed to load reports');
        setReports([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [user?.id]);

  // Helper: Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Helper: Transform scores object to array
  const transformScores = (scores) => {
    if (!scores) return [];
    const result = [];
    if (scores.resume_background !== undefined) {
      result.push({ category: 'Resume Background', score: Math.round(scores.resume_background * 100) });
    }
    if (scores.domain_knowledge !== undefined) {
      result.push({ category: 'Domain Knowledge', score: Math.round(scores.domain_knowledge * 100) });
    }
    if (scores.technical_skills !== undefined) {
      result.push({ category: 'Technical Skills', score: Math.round(scores.technical_skills * 100) });
    }
    if (scores.behavioral !== undefined) {
      result.push({ category: 'Behavioral', score: Math.round(scores.behavioral * 100) });
    }
    return result;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-50" />
            <h3 className="font-semibold mb-2">Error Loading Reports</h3>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Reports Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No reports available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{report.type}</span>
                      <span className="text-sm text-muted-foreground">{report.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{report.summary}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div
                      className={`flex items-center gap-1 ${
                        report.readinessImpact >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {report.readinessImpact >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">
                        {report.readinessImpact >= 0 ? '+' : ''}
                        {report.readinessImpact}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Videos Section - No API endpoint available yet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Video className="w-5 h-5" />
            Recorded Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.videos?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No recorded sessions available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.videos?.map((video) => (
                <div
                  key={video.id}
                  className="rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedVideo(video)}
                >
                  <div className="aspect-video bg-muted flex items-center justify-center relative">
                    <Play className="w-12 h-12 text-muted-foreground" />
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium truncate">{video.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {video.type}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {video.date}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {video.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Modal */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedReport?.type}</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {selectedReport.date}
                </span>
                <div
                  className={`flex items-center gap-1 ${
                    selectedReport.readinessImpact >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {selectedReport.readinessImpact >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {selectedReport.readinessImpact >= 0 ? '+' : ''}
                    {selectedReport.readinessImpact} points
                  </span>
                </div>
              </div>

              <p className="text-muted-foreground">{selectedReport.summary}</p>

              {selectedReport.scores && selectedReport.scores.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Scores</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedReport.scores.map((s) => (
                      <div
                        key={s.category}
                        className="flex items-center justify-between p-2 rounded bg-muted"
                      >
                        <span className="text-sm">{s.category}</span>
                        <span className="font-semibold">{s.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.strengths && selectedReport.strengths.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-green-600">Strengths</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selectedReport.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedReport.weaknesses && selectedReport.weaknesses.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Areas for Improvement</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selectedReport.weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedReport.recommendations && selectedReport.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selectedReport.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Player Modal - kept for future use when video API is available */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-16 h-16 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Video player placeholder</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Badge variant="secondary">{selectedVideo.type}</Badge>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {selectedVideo.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {selectedVideo.date}
                </span>
              </div>

              {selectedVideo.markers && selectedVideo.markers.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Key Moments</h4>
                  <div className="space-y-2">
                    {selectedVideo.markers.map((marker, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 rounded bg-muted text-sm cursor-pointer hover:bg-muted/80"
                      >
                        <span className="font-mono text-primary">{marker.time}</span>
                        <span>{marker.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Admin Notes</h4>
                <textarea
                  className="w-full p-3 rounded-lg border border-border bg-background resize-none"
                  rows={3}
                  placeholder="Add internal notes about this session..."
                />
                <Button size="sm" className="mt-2">
                  Save Note
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}