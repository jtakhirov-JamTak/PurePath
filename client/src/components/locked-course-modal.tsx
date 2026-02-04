import { useLocation } from "wouter";
import { COURSES, type CourseType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock, Sparkles, BookOpen, Package } from "lucide-react";

const courseIcons: Record<CourseType, React.ReactNode> = {
  course1: <Sparkles className="h-8 w-8" />,
  course2: <BookOpen className="h-8 w-8" />,
  bundle: <Package className="h-8 w-8" />,
};

interface LockedCourseModalProps {
  courseType: "course1" | "course2";
  open: boolean;
  onClose: () => void;
}

export function LockedCourseModal({ courseType, open, onClose }: LockedCourseModalProps) {
  const [, setLocation] = useLocation();
  const course = COURSES[courseType];
  const bundle = COURSES.bundle;

  const handlePurchase = (purchaseType: CourseType) => {
    localStorage.setItem("returnUrl", window.location.pathname);
    setLocation(`/checkout/${purchaseType}`);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="modal-locked-course">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <DialogTitle className="font-serif text-xl text-center">
            Unlock {course.name}
          </DialogTitle>
          <DialogDescription className="text-center">
            Get unlimited access for just ${(course.price / 100).toFixed(0)} (one-time payment).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => handlePurchase(courseType)}
            data-testid="button-purchase-course"
          >
            <div className="h-5 w-5 mr-2">{courseIcons[courseType]}</div>
            Purchase Now - ${(course.price / 100).toFixed(0)}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or save $19</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            size="lg"
            onClick={() => handlePurchase("bundle")}
            data-testid="button-purchase-bundle"
          >
            <Package className="h-5 w-5 mr-2" />
            Get the Bundle - ${(bundle.price / 100).toFixed(0)}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-2">
            Bundle includes both courses with lifetime access
          </p>
        </div>

        <div className="flex justify-center mt-4">
          <Button 
            variant="ghost" 
            onClick={onClose}
            data-testid="button-cancel"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
