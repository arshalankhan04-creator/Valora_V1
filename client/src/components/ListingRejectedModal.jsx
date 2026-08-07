import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'

// Shown when Step 4's AI verification confidently rejects a listing
// (photos don't match the claimed vehicle, or the photos don't all show
// the same vehicle) — surfaces the specific reasons rather than a single
// generic error line, so the seller knows exactly what to fix.
export default function ListingRejectedModal({ open, onOpenChange, reasons = [] }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertTriangle className="mb-2 size-8 text-destructive" />
          <AlertDialogTitle>We couldn't verify this listing</AlertDialogTitle>
          <AlertDialogDescription>
            Our AI check compared your photos against the vehicle details you entered and found a problem:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>

        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>Got it, let me fix this</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
