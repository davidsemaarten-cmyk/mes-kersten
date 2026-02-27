---
title: "[MEDIUM] N+1 Queries in Materials Endpoint"
labels: medium, performance, backend, phase-4
milestone: Phase 4 - Performance Optimization
assignees:
---

## 🟡 MEDIUM: N+1 Queries in Materials Endpoint

**Issue Type:** Performance
**Severity:** MEDIUM
**Effort:** 3 hours
**Phase:** Phase 4

---

## Problem Description

Materials endpoint runs separate COUNT query for each material:

```python
# backend/api/platestock.py:114-119
materials = query.order_by(Material.plaatcode_prefix).all()  # 1 query

for material in materials:  # ❌ N queries
    material.plate_count = db.query(Plate).filter(
        Plate.material_prefix == material.plaatcode_prefix
    ).count()  # Separate query per material
```

**If 50 materials exist:**
51 queries (1 + 50) instead of 1 query with JOIN

---

## Impact

- **Slow Response:** 50 materials = 50+ database round trips
- **Database Load:** Unnecessary query overhead
- **Scalability:** Degrades linearly with material count
- **User Experience:** Noticeable delay (100ms+ with 50 materials)

---

## Solution

Single query with LEFT JOIN and GROUP BY:

```python
from sqlalchemy import func

query = (
    db.query(
        Material,
        func.coalesce(func.count(Plate.id), 0).label('plate_count')
    )
    .outerjoin(Plate, Material.plaatcode_prefix == Plate.material_prefix)
    .group_by(Material.id)
)

results = query.order_by(Material.plaatcode_prefix).all()

materials = []
for material, plate_count in results:
    material.plate_count = plate_count
    materials.append(material)
```

---

## Acceptance Criteria

- [ ] Materials endpoint uses single query (1-2 queries max)
- [ ] Plate counts still accurate
- [ ] Performance test passes (max 2 queries for 50 materials)
- [ ] Response time <100ms for 50 materials
- [ ] All filters still work

---

## Testing

**Performance test:**
```python
def test_materials_endpoint_query_count(client):
    # Create 50 materials
    # Fetch all materials
    # Assert query_count <= 2  # Not 51!
```

**Manual test:**
```bash
# Create 50 materials
for i in {1..50}; do curl ...; done

# Time response
time curl localhost:8000/api/platestock/materials
# Should be <100ms
```

---

## Files to Change

- `backend/api/platestock.py` (optimize query)
- `backend/tests/performance/test_queries.py` (NEW test)

---

## References

- Implementation Plan: Phase 4, Step 4.1-4.2
- Code Review: Issue #7
