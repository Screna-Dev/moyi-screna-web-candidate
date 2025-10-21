import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import { X, Upload, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfileEdit() {
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState([
    { name: "Python", level: 85 },
    { name: "React", level: 90 },
    { name: "SQL", level: 70 },
  ]);
  const [hourlyRate, setHourlyRate] = useState([80, 150]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    toast({
      title: "Profile updated successfully!",
      description: "Your changes have been saved.",
    });
    navigate('/profile');
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const addSkill = () => {
    setSkills([...skills, { name: "New Skill", level: 50 }]);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Edit Profile</h1>
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-8 pb-20">
          {/* Personal Info */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="Alex Johnson" className="mt-2" />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="alex@example.com" disabled className="mt-2 bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="San Francisco, CA" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="visa">Work Authorization</Label>
                <Select defaultValue="h1b">
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h1b">H-1B</SelectItem>
                    <SelectItem value="c2c">C2C</SelectItem>
                    <SelectItem value="greencard">Green Card</SelectItem>
                    <SelectItem value="citizen">US Citizen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Professional Summary */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Professional Summary</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bio">Bio (400 characters max)</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  maxLength={400}
                  placeholder="Tell us about your experience and expertise..."
                  defaultValue="Senior Full-Stack Developer with 8+ years of experience building scalable web applications. Specialized in React, Node.js, and cloud architecture."
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Resume Upload</Label>
                <div className="mt-2 border-2 border-dashed border-input rounded-lg p-6 text-center hover:border-primary transition-smooth cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">PDF, DOC (Max 5MB)</p>
                </div>
              </div>

              <div>
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input id="linkedin" type="url" placeholder="https://linkedin.com/in/username" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="github">GitHub URL</Label>
                <Input id="github" type="url" placeholder="https://github.com/username" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="portfolio">Portfolio URL</Label>
                <Input id="portfolio" type="url" placeholder="https://yourportfolio.com" className="mt-2" />
              </div>
            </div>
          </section>

          {/* Skills */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Skills & Proficiency</h3>
              <Button size="sm" variant="outline" onClick={addSkill}>
                <Plus className="w-4 h-4 mr-1" />
                Add Skill
              </Button>
            </div>
            <div className="space-y-4">
              {skills.map((skill, index) => (
                <div key={index} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <Input
                      value={skill.name}
                      onChange={(e) => {
                        const newSkills = [...skills];
                        newSkills[index].name = e.target.value;
                        setSkills(newSkills);
                      }}
                      className="flex-1 mr-3"
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeSkill(index)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Proficiency</span>
                      <span className="font-semibold">{skill.level}%</span>
                    </div>
                    <Slider
                      value={[skill.level]}
                      onValueChange={(value) => {
                        const newSkills = [...skills];
                        newSkills[index].level = value[0];
                        setSkills(newSkills);
                      }}
                      max={100}
                      step={5}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Preferences & Privacy */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Preferences & Privacy</h3>
            <div className="space-y-6">
              <div>
                <Label>Preferred Job Type</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {["Contract", "Full-Time", "Hybrid"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`p-3 rounded-lg border-2 transition-smooth ${
                        type === "Contract"
                          ? "border-primary bg-primary/5"
                          : "border-input hover:border-primary/50"
                      }`}
                    >
                      <span className="text-sm font-medium">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Desired Hourly Rate Range</Label>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Range</span>
                    <span className="font-semibold">
                      ${hourlyRate[0]} - ${hourlyRate[1]}/hr
                    </span>
                  </div>
                  <Slider
                    value={hourlyRate}
                    onValueChange={setHourlyRate}
                    min={50}
                    max={250}
                    step={5}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <p className="font-medium mb-1">Data Sharing</p>
                  <p className="text-sm text-muted-foreground">Allow vendors to view anonymized results</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div>
                <Label className="mb-3 block">Notification Preferences</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email notifications</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SMS notifications</span>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">In-app notifications</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="fixed bottom-0 right-0 left-0 sm:left-auto sm:w-[600px] bg-background border-t border-border p-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/profile')}>
            Cancel
          </Button>
          <Button className="flex-1 gradient-primary" onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
