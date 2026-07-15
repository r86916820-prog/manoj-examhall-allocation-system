import { DatabaseState, Student, Hall, Exam, Allocation } from '../src/types';

interface AllocationResult {
  allocations: Allocation[];
  allocatedCount: number;
  unallocatedCount: number;
  unallocatedStudentIds: string[];
}

/**
 * Intelligent Seating Allocation Algorithm
 */
export function performAutomaticAllocation(
  state: DatabaseState,
  examId: string,
  selectedHallIds: string[]
): AllocationResult {
  const exam = state.exams.find(e => e.id === examId);
  if (!exam) {
    throw new Error(`Exam with ID ${examId} not found.`);
  }

  // 1. Find all students taking this exam's subject
  const candidateStudents = state.students.filter(student => 
    student.subjects.includes(exam.subjectCode)
  );

  if (candidateStudents.length === 0) {
    return {
      allocations: state.allocations, // unchanged
      allocatedCount: 0,
      unallocatedCount: 0,
      unallocatedStudentIds: []
    };
  }

  // Find existing locked allocations for this exam to preserve them
  const existingAllocations = state.allocations.filter(a => a.examId === examId);
  const lockedAllocations = existingAllocations.filter(a => a.isLocked);
  const lockedStudentIds = new Set(lockedAllocations.map(a => a.studentId));
  const lockedSeats = new Set(lockedAllocations.map(a => `${a.hallId}-${a.row}-${a.col}`));

  // Students who need allocation (not locked)
  const studentsToAllocate = candidateStudents.filter(s => !lockedStudentIds.has(s.id));

  // 2. Separate departments and mix them using Round-Robin merging
  // This automatically mixes departments and separates consecutive roll numbers of the same department.
  const deptMap: Record<string, Student[]> = {};
  studentsToAllocate.forEach(student => {
    if (!deptMap[student.department]) {
      deptMap[student.department] = [];
    }
    deptMap[student.department].push(student);
  });

  // Sort each department's students by roll number to keep a structured order before interleaving
  Object.keys(deptMap).forEach(dept => {
    deptMap[dept].sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
  });

  const mixedStudents: Student[] = [];
  const deptKeys = Object.keys(deptMap);
  
  if (deptKeys.length > 1) {
    // Interleave departments round-robin
    let hasMore = true;
    let idx = 0;
    while (hasMore) {
      hasMore = false;
      deptKeys.forEach(dept => {
        if (idx < deptMap[dept].length) {
          mixedStudents.push(deptMap[dept][idx]);
          hasMore = true;
        }
      });
      idx++;
    }
  } else if (deptKeys.length === 1) {
    // Only one department. Split in half and interleave to avoid placing consecutive roll numbers next to each other
    const list = deptMap[deptKeys[0]];
    const mid = Math.ceil(list.length / 2);
    const firstHalf = list.slice(0, mid);
    const secondHalf = list.slice(mid);
    
    for (let i = 0; i < mid; i++) {
      if (i < firstHalf.length) mixedStudents.push(firstHalf[i]);
      if (i < secondHalf.length) mixedStudents.push(secondHalf[i]);
    }
  }

  // 3. Select active halls designated for this allocation
  const halls = state.halls.filter(h => 
    h.status === 'active' && selectedHallIds.includes(h.id)
  );

  // Clear existing non-locked allocations for this exam
  let newAllocations = [...state.allocations.filter(a => a.examId !== examId), ...lockedAllocations];

  let studentIdx = 0;
  const unallocatedStudentIds: string[] = [];

  // Iterate over halls to place students in unlocked positions
  halls.forEach(hall => {
    const r = hall.rows;
    const c = hall.cols;

    for (let row = 0; row < r; row++) {
      for (let col = 0; col < c; col++) {
        // If we ran out of students, stop
        if (studentIdx >= mixedStudents.length) {
          break;
        }

        const seatKey = `${hall.id}-${row}-${col}`;
        // If this seat is already occupied by a locked student, skip it
        if (lockedSeats.has(seatKey)) {
          continue;
        }

        const student = mixedStudents[studentIdx];
        const letter = String.fromCharCode(65 + row); // Row label: A, B, C...
        const seatNumber = `${letter}-${col + 1}`; // e.g. A-1, B-3

        newAllocations.push({
          id: `alloc-${examId}-${student.id}-${hall.id}`,
          examId,
          studentId: student.id,
          hallId: hall.id,
          row,
          col,
          seatNumber,
          isLocked: false
        });

        studentIdx++;
      }
      if (studentIdx >= mixedStudents.length) {
        break;
      }
    }
  });

  // Track overflow students
  while (studentIdx < mixedStudents.length) {
    unallocatedStudentIds.push(mixedStudents[studentIdx].id);
    studentIdx++;
  }

  return {
    allocations: newAllocations,
    allocatedCount: candidateStudents.length - unallocatedStudentIds.length,
    unallocatedCount: unallocatedStudentIds.length,
    unallocatedStudentIds
  };
}
