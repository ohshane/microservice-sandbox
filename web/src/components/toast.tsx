import { Message } from "@/context/toast";


function Toast({ type, content, fadeOut }: { type: Message["type"], content: string, fadeOut?: boolean }) {
  const typeStyles = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white",
  };

  return (
    <div
      className={`px-4 py-2 rounded shadow mb-2 ${typeStyles[type]} 
                  transition-opacity duration-500 ease-in-out 
                  ${fadeOut ? "opacity-0" : "opacity-100"}`}
      role="alert"
    >
      <p>{content}</p>
    </div>
  );
}

export function ToastContainer({ toasts }: { toasts: Message[] }) {
  return (
    <div className="fixed inset-x-0 bottom-4 flex flex-col items-center z-50 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} type={toast.type} content={toast.content} fadeOut={toast.fadeOut} />
      ))}
    </div>
  );
}
