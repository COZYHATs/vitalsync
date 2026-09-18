// Package future contains contracts for later phases. None of these features are active in Phase 1.
package future

import "context"

type Document struct { ID, PatientID string }
type ExtractionResult struct{}
type DocumentExtractor interface { Extract(context.Context, Document) (ExtractionResult, error) }
type KnowledgeStore interface {
	CreateNote(context.Context, string, string) error
	UpdateNote(context.Context, string, string) error
	MoveNote(context.Context, string, string) error
	CreateFolder(context.Context, string) error
}
// TimelineEvent is a future, source-linked model—not a persisted Phase 1 record.
type TimelineEvent struct { ID, PatientID, EventType, Title, SourceDocumentID string; Confidence float64 }
