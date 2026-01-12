export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')

  if (!groupId) {
    return Response.json({ valid: false }, { status: 400 })
  }

  try {
    // Call your backend to validate room
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${backendUrl}/queue?groupId=${groupId}`)
    
    if (response.ok) {
      return Response.json({ valid: true })
    }
    
    return Response.json({ valid: false })
  } catch (error) {
    console.error('Room validation error:', error)
    return Response.json({ valid: false })
  }
}
