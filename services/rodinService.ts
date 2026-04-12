export const generate3DModel = async (formData: FormData): Promise<{ uuid: string }> => {
  const response = await fetch('/api/rodin', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate 3D model');
  }

  return response.json();
};

export const checkRodinStatus = async (uuid: string): Promise<any> => {
  const response = await fetch(`/api/rodin/status/${uuid}`);
  return response.json();
};
